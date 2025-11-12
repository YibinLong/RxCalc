import type { NDCSearchResult, NDCProduct, NDCRetrievalResult, NDCError, NDCPackageInfo } from '$lib/types/ndc';

const FDA_NDC_BASE_URL = 'https://api.fda.gov/drug/ndc.json';

// Simple cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the API cache (useful for testing)
 */
export function clearCache(): void {
  apiCache.clear();
}

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
 * Logs debug information if DEBUG environment variable is set
 */
function debugLog(message: string, data?: any): void {
  if (import.meta.env.DEBUG) {
    console.log(`[NDC API] ${message}`, data);
  }
}

/**
 * Handles API errors and creates standardized error objects
 */
function handleAPIError(error: any, context: string): NDCError {
  debugLog(`API Error in ${context}:`, error);

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      details: 'Unable to connect to FDA NDC API. Please check your internet connection.'
    };
  }

  if (error.message && error.message.toLowerCase().includes('network')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      details: 'Unable to connect to FDA NDC API. Please check your internet connection.'
    };
  }

  if (error.status) {
    return {
      code: `HTTP_${error.status}`,
      message: error.statusText || 'HTTP request failed',
      details: `HTTP ${error.status} error occurred while calling FDA NDC API`
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    details: error.message || 'Unknown error during API call'
  };
}

/**
 * Makes a GET request to the FDA NDC API
 */
async function makeAPIRequest(searchParams: Record<string, string> = {}): Promise<any> {
  const url = new URL(FDA_NDC_BASE_URL);
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const cacheKey = url.toString();
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    debugLog('Using cached data for:', url.toString());
    return cachedData;
  }

  debugLog('Making API request to:', url.toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RxCalc/1.0 (https://github.com/your-repo)'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLog(`API Error Response: ${response.status} ${response.statusText}`, errorText);
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      throw error;
    }

    const data = await response.json();

    // Check for FDA API error format
    if (data.error) {
      const fdaError = new Error(data.error.message || 'FDA API returned an error');
      (fdaError as any).code = data.error.code || 'FDA_ERROR';
      throw fdaError;
    }

    setCachedData(cacheKey, data);
    return data;

  } catch (error) {
    throw handleAPIError(error, 'makeAPIRequest');
  }
}

/**
 * Extracts package size from package description
 * Examples: "100 TABLET in 1 BOTTLE", "30 mL in 1 VIAL", "1 TUBE in 1 CARTON"
 */
function extractPackageSize(description: string): number {
  if (!description || typeof description !== 'string') {
    debugLog('Invalid package description for size extraction:', description);
    return 1;
  }

  debugLog('Extracting package size from description:', description);

  // Try multiple patterns to extract package size
  const patterns = [
    // Pattern: "100 TABLET in 1 BOTTLE" - match numbers at start
    /^(\d+(?:\.\d+)?)\s+[a-zA-Z]+/i,
    // Pattern: "contains 100 tablets" - match numbers before common words
    /(\d+(?:\.\d+)?)\s+(?:tablet|tablet|capsule|capsule|pill|pills|ml|mg|g|dose|unit)s?\s/i,
    // Pattern: any number followed by unit anywhere in description
    /(\d+(?:\.\d+)?)\s*(?:tablet|tablet|capsule|capsule|pill|pills|ml|mg|g|dose|unit)/i
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const size = parseFloat(match[1]);
      debugLog(`Extracted package size ${size} from "${description}"`);

      if (size && size > 0 && isFinite(size)) {
        return size;
      }
    }
  }

  debugLog(`Could not extract valid package size from "${description}", using default 1`);
  return 1; // Default to 1 if size cannot be determined
}

/**
 * Determines if a package is active based on dates
 */
function determinePackageStatus(startDate: string, endDate?: string, listingExpirationDate?: string): 'active' | 'inactive' {
  const now = new Date();
  const start = new Date(startDate);

  // Check if product has started marketing
  if (now < start) {
    return 'inactive';
  }

  // Check if product has ended marketing
  if (endDate) {
    const end = new Date(endDate);
    if (now > end) {
      return 'inactive';
    }
  }

  // Check if listing has expired (more reliable than marketing_end_date)
  if (listingExpirationDate) {
    const expiration = new Date(listingExpirationDate);
    if (now > expiration) {
      return 'inactive';
    }
  }

  // If no end date or expiration date, and has started marketing, consider it active
  return 'active';
}

/**
 * Fetches NDCs and package information using RxCUI from FDA NDC Directory API
 * Note: FDA NDC API doesn't support direct RxCUI searches, so this function
 * will return an error indicating the limitation
 *
 * @param rxcui - The RxNorm Concept Unique Identifier
 * @returns Promise resolving to NDC retrieval result with package information
 */
export async function getNDCsByRxCUI(rxcui: string): Promise<NDCRetrievalResult> {
  try {
    if (!rxcui || rxcui.trim().length === 0) {
      return {
        success: false,
        ndcs: [],
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid RxCUI',
          details: 'RxCUI must be provided and cannot be empty'
        }
      };
    }

    debugLog(`FDA NDC API doesn't support direct RxCUI searches for RxCUI: ${(rxcui || '').trim()}`);

    // FDA NDC API doesnt support direct RxCUI searches
    return {
      success: false,
      ndcs: [],
      error: {
        code: 'UNSUPPORTED_SEARCH',
        message: 'Direct RxCUI search not supported by FDA NDC API',
        details: 'The FDA NDC API does not support searching by RxNorm Concept Unique Identifiers (RxCUI). Please use drug name searches instead.'
      }
    };

  } catch (error) {
    debugLog('Error in getNDCsByRxCUI:', error);
    return {
      success: false,
      ndcs: [],
      error: error as NDCError
    };
  }
}

/**
 * Searches for NDC products by drug name
 *
 * @param drugName - The name of the drug to search for
 * @returns Promise resolving to search results
 */
export async function searchNDCsByDrugName(drugName: string): Promise<NDCRetrievalResult> {
  try {
    if (!drugName || drugName.trim().length < 2) {
      return {
        success: false,
        ndcs: [],
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid drug name',
          details: 'Drug name must be at least 2 characters long'
        }
      };
    }

    const cleanedName = drugName.trim();
    debugLog(`Searching NDCs for drug name: ${cleanedName}`);

    // Search for products by generic or brand name using FDA API format
    const searchResult = await makeAPIRequest({
      search: `(generic_name:"${cleanedName}") OR (brand_name:"${cleanedName}")`,
      limit: '50'
    });

    if (!searchResult.results || searchResult.results.length === 0) {
      return {
        success: false,
        ndcs: [],
        error: {
          code: 'NO_NDCS_FOUND',
          message: 'No NDCs found for this drug name',
          details: `No NDCs found in FDA database for "${cleanedName}"`
        }
      };
    }

    const allPackages: NDCPackageInfo[] = [];

    // Process each product and extract packaging information
    for (const product of searchResult.results) {
      if (product.packaging) {
        for (const pkg of product.packaging) {
          const packageSize = extractPackageSize(pkg.description);
          const status = determinePackageStatus(
            product.marketing_start_date,
            product.marketing_end_date,
            product.listing_expiration_date
          );

          allPackages.push({
            product_ndc: product.product_ndc,
            package_ndc: pkg.package_ndc,
            description: pkg.description,
            size: packageSize,
            status,
            isSample: pkg.sample || false,
            marketingStartDate: product.marketing_start_date,
            marketingEndDate: product.marketing_end_date
          });
        }
      }
    }

    // Convert to expected format for the application
    const ndcs = allPackages.map(pkg => ({
      ndc: pkg.package_ndc,
      packageDescription: pkg.description,
      packageSize: pkg.size,
      status: pkg.status,
      marketingStartDate: pkg.marketingStartDate,
      marketingEndDate: pkg.marketingEndDate
    }));

    debugLog(`Found ${ndcs.length} NDC packages for drug "${cleanedName}"`);

    return {
      success: true,
      ndcs: allPackages
    };

  } catch (error) {
    debugLog('Error in searchNDCsByDrugName:', error);
    return {
      success: false,
      ndcs: [],
      error: error as NDCError
    };
  }
}

/**
 * Search for NDC products directly by NDC code
 *
 * @param ndcCode - The NDC code to search for (can be formatted or unformatted)
 * @returns Promise resolving to NDC retrieval result
 */
export async function searchNDCByCode(ndcCode: string): Promise<NDCRetrievalResult> {
  try {
    if (!ndcCode || ndcCode.trim().length < 10) {
      return {
        success: false,
        ndcs: [],
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid NDC code',
          details: 'NDC code must be at least 10 digits long'
        }
      };
    }

    // Clean and format the NDC code - remove non-digits
    const cleanNDC = ndcCode.replace(/[^0-9]/g, '');
    debugLog(`Searching FDA NDC API for NDC code: ${cleanNDC}`);

    // Search for the specific NDC code
    const searchResult = await makeAPIRequest({
      search: `product_ndc:${cleanNDC}`,
      limit: '20'
    });

    if (!searchResult.results || searchResult.results.length === 0) {
      // Try formatted search (with dashes)
      if (cleanNDC.length === 11) {
        const formattedNDC = `${cleanNDC.slice(0,5)}-${cleanNDC.slice(5,9)}-${cleanNDC.slice(9,11)}`;
        const formattedResult = await makeAPIRequest({
          search: `product_ndc:"${formattedNDC}"`,
          limit: '20'
        });

        if (!formattedResult.results || formattedResult.results.length === 0) {
          return {
            success: false,
            ndcs: [],
            error: {
              code: 'NO_NDCS_FOUND',
              message: 'NDC code not found',
              details: `No NDC found in FDA database for "${ndcCode}"`
            }
          };
        }

        // Process formatted results
        return processNDCSearchResult(formattedResult, ndcCode);
      }

      return {
        success: false,
        ndcs: [],
        error: {
          code: 'NO_NDCS_FOUND',
          message: 'NDC code not found',
          details: `No NDC found in FDA database for "${ndcCode}"`
        }
      };
    }

    return processNDCSearchResult(searchResult, ndcCode);

  } catch (error) {
    debugLog('Error in searchNDCByCode:', error);
    return {
      success: false,
      ndcs: [],
      error: error as NDCError
    };
  }
}

/**
 * Process FDA API search result and convert to our format
 */
function processNDCSearchResult(searchResult: any, originalNDC: string): NDCRetrievalResult {
  const allPackages: NDCPackageInfo[] = [];

  // Process each product and its packaging information
  for (const product of searchResult.results) {
    if (product.packaging) {
      for (const pkg of product.packaging) {
        const packageSize = extractPackageSize(pkg.description);
        const status = determinePackageStatus(
          product.marketing_start_date,
          product.marketing_end_date,
          product.listing_expiration_date
        );

        allPackages.push({
          product_ndc: product.product_ndc,
          package_ndc: pkg.package_ndc,
          description: pkg.description,
          size: packageSize,
          status,
          isSample: pkg.sample || false,
          marketingStartDate: product.marketing_start_date,
          marketingEndDate: product.marketing_end_date
        });
      }
    }
  }

  // Convert to expected format for the application
  const ndcs = allPackages.map(pkg => ({
    ndc: pkg.package_ndc,
    packageDescription: pkg.description,
    packageSize: pkg.size,
    status: pkg.status,
    marketingStartDate: pkg.marketingStartDate,
    marketingEndDate: pkg.marketingEndDate
  }));

  debugLog(`Found ${ndcs.length} NDC packages for NDC "${originalNDC}"`);

  return {
    success: true,
    ndcs
  };
}

/**
 * Filters NDCs to show only active ones
 *
 * @param ndcs - Array of NDC packages
 * @returns Filtered array containing only active NDCs
 */
export function filterActiveNDCs(ndcs: NDCPackageInfo[]): NDCPackageInfo[] {
  return ndcs.filter(ndc => ndc.status === 'active' && !ndc.isSample);
}

/**
 * Sorts NDCs by package size (smallest to largest)
 *
 * @param ndcs - Array of NDC packages
 * @returns Sorted array by package size
 */
export function sortNDCsBySize(ndcs: NDCPackageInfo[]): NDCPackageInfo[] {
  return [...ndcs].sort((a, b) => a.size - b.size);
}