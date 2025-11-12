import type { RxNormAPIResponse, DrugNormalizationResult, NDCStatusResult, RxNormError } from '$lib/types/rxnorm';
import { logApi, logValidation, logPerformance } from './logger';

const RXNORM_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

// Simple cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Gets cached data or returns null if expired/not found
 */
function getCachedData(key: string): any | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  if (cached) {
    apiCache.delete(key);
  }
  return null;
}

/**
 * Sets cache data with timestamp
 */
function setCachedData(key: string, data: any): void {
  apiCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Handles API errors and creates standardized error objects
 */
function handleAPIError(error: any, context: string): RxNormError {
  logApi.error(`API Error in ${context}:`, error);

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      details: 'Unable to connect to RxNorm API. Please check your internet connection.'
    };
  }

  if (error.status) {
    return {
      code: `HTTP_${error.status}`,
      message: error.statusText || 'HTTP request failed',
      details: `HTTP ${error.status} error occurred while calling RxNorm API`
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    details: error.message || 'Unknown error during API call'
  };
}

/**
 * Makes a GET request to the RxNorm API
 */
async function makeAPIRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${RXNORM_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const cacheKey = url.toString();
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    logApi.request('GET', endpoint, { cached: true });
    return cachedData;
  }

  logApi.request('GET', endpoint, { url: url.toString() });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RxCalc/1.0 (https://github.com/your-repo)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    setCachedData(cacheKey, data);
    logApi.response('GET', endpoint, 200, { cached: false, dataSize: JSON.stringify(data).length });
    return data;

  } catch (error) {
    throw handleAPIError(error, endpoint);
  }
}

/**
 * Converts drug name or NDC to RxCUI using RxNorm API
 *
 * @param drugInput - Either a drug name (e.g., "Lisinopril 10mg") or NDC code
 * @returns Promise resolving to normalized drug information or error
 */
export async function normalizeDrugToRxCUI(drugInput: string): Promise<DrugNormalizationResult> {
  const cleanedInput = drugInput ? drugInput.trim() : '';

  try {
    if (!drugInput || cleanedInput.length < 2) {
      return {
        success: false,
        drugName: cleanedInput,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid drug input',
          details: 'Drug name or NDC must be at least 2 characters long'
        }
      };
    }

    // Check if input looks like an NDC (11 digits or formatted with hyphens)
    const isNDC = /^\d{11}$|^\d{5}-\d{4}-\d{2}$|^\d{5}-\d{3}-\d{2}$/.test(cleanedInput.replace(/[^0-9-]/g, ''));

    let apiData: RxNormAPIResponse;

    if (isNDC) {
      // For NDC input, use the ndcstatus endpoint to get RxCUI
      logApi.request('POST', '/normalize', { type: 'NDC', input: cleanedInput });
      apiData = await makeAPIRequest('/ndcstatus', { ndc: cleanedInput });

      if (apiData.status?.code !== 200) {
        return {
          success: false,
          drugName: cleanedInput,
          error: {
            code: 'NDC_NOT_FOUND',
            message: 'NDC not found in RxNorm database',
            details: `The NDC ${cleanedInput} was not found or is invalid`
          }
        };
      }

      // Extract RxCUI from NDC status response
      const rxcui = apiData.idGroup?.rxnormId?.[0];
      if (!rxcui) {
        return {
          success: false,
          drugName: cleanedInput,
          error: {
            code: 'NO_RXCUI_FOUND',
            message: 'No RxCUI found for this NDC',
            details: 'The NDC exists but no corresponding RxCUI was found'
          }
        };
      }

      return {
        success: true,
        rxcui,
        drugName: cleanedInput
      };

    } else {
      // For drug name input, use the rxcui endpoint
      logApi.request('POST', '/normalize', { type: 'drug_name', input: cleanedInput });
      apiData = await makeAPIRequest('/rxcui', { name: cleanedInput });

      if (!apiData.idGroup?.rxnormId?.length) {
        return {
          success: false,
          drugName: cleanedInput,
          error: {
            code: 'DRUG_NOT_FOUND',
            message: 'Drug not found in RxNorm database',
            details: `No matching drug found for "${cleanedInput}"`
          }
        };
      }

      const rxcui = apiData.idGroup.rxnormId[0];
      return {
        success: true,
        rxcui,
        drugName: cleanedInput
      };
    }

  } catch (error) {
    return {
      success: false,
      drugName: cleanedInput,
      error: error as RxNormError
    };
  }
}

/**
 * Gets additional drug information using RxCUI
 *
 * @param rxcui - The RxNorm Concept Unique Identifier
 * @returns Promise resolving to drug properties or error
 */
export async function getDrugProperties(rxcui: string): Promise<any> {
  try {
    if (!rxcui) {
      throw new Error('RxCUI is required');
    }

    logApi.request('GET', '/properties', { rxcui });
    return await makeAPIRequest('/rxcui', { id: rxcui, getProperties: 'true' });

  } catch (error) {
    throw handleAPIError(error, 'getDrugProperties');
  }
}

/**
 * Checks NDC status and returns related information
 *
 * @param ndc - The National Drug Code
 * @returns Promise resolving to NDC status information
 */
export async function getNDCStatus(ndc: string): Promise<NDCStatusResult> {
  try {
    if (!ndc || !/^\d{11}$|^\d{5}-\d{4}-\d{2}$|^\d{5}-\d{3}-\d{2}$/.test(ndc.replace(/[^0-9-]/g, ''))) {
      throw new Error('Invalid NDC format');
    }

    logApi.request('GET', '/ndcstatus', { ndc });
    const response = await makeAPIRequest('/ndcstatus', { ndc });

    // Extract status information from response
    const rxcui = response.idGroup?.rxnormId?.[0];
    const status = response.status?.code === 200 ? 'active' : 'inactive';

    return {
      rxcui: rxcui || '',
      ndc: ndc,
      status: status as 'active' | 'inactive' | 'unknown'
    };

  } catch (error) {
    throw handleAPIError(error, 'getNDCStatus');
  }
}

/**
 * Searches for drugs using various terms
 *
 * @param searchTerm - The term to search for
 * @returns Promise resolving to search results
 */
export async function searchDrugs(searchTerm: string): Promise<any> {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new Error('Search term must be at least 2 characters long');
    }

    logApi.request('GET', '/search', { term: searchTerm });
    return await makeAPIRequest('/drugs', { name: searchTerm.trim() });

  } catch (error) {
    throw handleAPIError(error, 'searchDrugs');
  }
}