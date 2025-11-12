import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNDCsByRxCUI, searchNDCsByDrugName, filterActiveNDCs, sortNDCsBySize, clearCache } from '../src/lib/services/ndc';
import type { NDCPackageInfo } from '../src/lib/types/ndc';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

describe('NDC Retrieval Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any cache
    localStorageMock.clear();
    clearCache();
  });

  describe('getNDCsByRxCUI', () => {
    it('should successfully fetch NDCs for a valid RxCUI', async () => {
      const mockResponse = {
        search_results: {
          drug_products: [
            {
              product_ndc: '12345-678-90',
              generic_name: 'Lisinopril',
              brand_name: 'Zestril',
              dosage_form: 'TABLET',
              route: ['ORAL'],
              marketing_status: 'Prescription',
              listing_expiration_date: '2025-12-31',
              marketing_start_date: '2020-01-01',
              application_number: 'NDA019621',
              labeler_name: 'AstraZeneca',
              packaging: [
                {
                  package_ndc: '12345-678-30',
                  description: '30 TABLET in 1 BOTTLE',
                  start_marketing_date: '2020-01-01',
                  sample: false
                },
                {
                  package_ndc: '12345-678-90',
                  description: '90 TABLET in 1 BOTTLE',
                  start_marketing_date: '2020-01-01',
                  sample: false
                }
              ],
              active_ingredients: [
                {
                  name: 'Lisinopril',
                  strength: '10 mg'
                }
              ],
              pharm_class: ['Angiotensin Converting Enzyme Inhibitor [EPC]'],
              rxcui: '316074'
            }
          ]
        },
        meta: {
          total_results: 1,
          limit: 50,
          skip: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(true);
      expect(result.rxcui).toBe('316074');
      expect(result.ndcs).toHaveLength(2);
      expect(result.ndcs[0]).toEqual({
        ndc: '12345-678-30',
        packageDescription: '30 TABLET in 1 BOTTLE',
        packageSize: 30,
        status: 'active',
        marketingStartDate: '2020-01-01',
        marketingEndDate: undefined
      });
    });

    it('should handle invalid RxCUI input', async () => {
      const result = await getNDCsByRxCUI('');

      expect(result.success).toBe(false);
      expect(result.ndcs).toHaveLength(0);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(false);
      expect(result.ndcs).toHaveLength(0);
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });

    it('should handle no results found', async () => {
      const mockResponse = {
        search_results: {
          drug_products: []
        },
        meta: {
          total_results: 0,
          limit: 50,
          skip: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getNDCsByRxCUI('999999');

      expect(result.success).toBe(false);
      expect(result.ndcs).toHaveLength(0);
      expect(result.error?.code).toBe('NO_NDCS_FOUND');
    });

    it('should mark packages as inactive if marketing date has passed', async () => {
      const mockResponse = {
        search_results: {
          drug_products: [
            {
              product_ndc: '12345-678-90',
              generic_name: 'Lisinopril',
              brand_name: 'Zestril',
              dosage_form: 'TABLET',
              route: ['ORAL'],
              marketing_status: 'Prescription',
              listing_expiration_date: '2021-12-31',
              marketing_start_date: '2020-01-01',
              application_number: 'NDA019621',
              labeler_name: 'AstraZeneca',
              packaging: [
                {
                  package_ndc: '12345-678-30',
                  description: '30 TABLET in 1 BOTTLE',
                  start_marketing_date: '2020-01-01',
                  end_marketing_date: '2021-12-31',
                  sample: false
                }
              ],
              active_ingredients: [
                {
                  name: 'Lisinopril',
                  strength: '10 mg'
                }
              ],
              pharm_class: ['Angiotensin Converting Enzyme Inhibitor [EPC]'],
              rxcui: '316074'
            }
          ]
        },
        meta: {
          total_results: 1,
          limit: 50,
          skip: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(true);
      expect(result.ndcs[0].status).toBe('inactive');
    });
  });

  describe('searchNDCsByDrugName', () => {
    it('should successfully search NDCs by drug name', async () => {
      const mockResponse = {
        search_results: {
          drug_products: [
            {
              product_ndc: '12345-678-90',
              generic_name: 'Lisinopril',
              brand_name: 'Zestril',
              dosage_form: 'TABLET',
              route: ['ORAL'],
              marketing_status: 'Prescription',
              listing_expiration_date: '2025-12-31',
              marketing_start_date: '2020-01-01',
              application_number: 'NDA019621',
              labeler_name: 'AstraZeneca',
              packaging: [
                {
                  package_ndc: '12345-678-30',
                  description: '30 TABLET in 1 BOTTLE',
                  start_marketing_date: '2020-01-01',
                  sample: false
                }
              ],
              active_ingredients: [
                {
                  name: 'Lisinopril',
                  strength: '10 mg'
                }
              ],
              pharm_class: ['Angiotensin Converting Enzyme Inhibitor [EPC]']
            }
          ]
        },
        meta: {
          total_results: 1,
          limit: 50,
          skip: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await searchNDCsByDrugName('Lisinopril');

      expect(result.success).toBe(true);
      expect(result.ndcs).toHaveLength(1);
      expect(result.ndcs[0].packageDescription).toBe('30 TABLET in 1 BOTTLE');
    });

    it('should handle invalid drug name input', async () => {
      const result = await searchNDCsByDrugName('L');

      expect(result.success).toBe(false);
      expect(result.ndcs).toHaveLength(0);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should handle no results found for drug name', async () => {
      const mockResponse = {
        search_results: {
          drug_products: []
        },
        meta: {
          total_results: 0,
          limit: 50,
          skip: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await searchNDCsByDrugName('NonExistentDrug');

      expect(result.success).toBe(false);
      expect(result.ndcs).toHaveLength(0);
      expect(result.error?.code).toBe('NO_NDCS_FOUND');
    });
  });

  describe('filterActiveNDCs', () => {
    it('should filter out inactive and sample NDCs', () => {
      const ndcs: NDCPackageInfo[] = [
        {
          product_ndc: '12345-678-90',
          package_ndc: '12345-678-30',
          description: '30 TABLET in 1 BOTTLE',
          size: 30,
          status: 'active',
          isSample: false,
          marketingStartDate: '2020-01-01'
        },
        {
          product_ndc: '12345-678-91',
          package_ndc: '12345-678-60',
          description: '60 TABLET in 1 BOTTLE',
          size: 60,
          status: 'inactive',
          isSample: false,
          marketingStartDate: '2020-01-01'
        },
        {
          product_ndc: '12345-678-92',
          package_ndc: '12345-678-10',
          description: '10 TABLET in 1 BOTTLE',
          size: 10,
          status: 'active',
          isSample: true,
          marketingStartDate: '2020-01-01'
        }
      ];

      const filtered = filterActiveNDCs(ndcs);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].package_ndc).toBe('12345-678-30');
    });
  });

  describe('sortNDCsBySize', () => {
    it('should sort NDCs by package size in ascending order', () => {
      const ndcs: NDCPackageInfo[] = [
        {
          product_ndc: '12345-678-90',
          package_ndc: '12345-678-90',
          description: '90 TABLET in 1 BOTTLE',
          size: 90,
          status: 'active',
          isSample: false,
          marketingStartDate: '2020-01-01'
        },
        {
          product_ndc: '12345-678-91',
          package_ndc: '12345-678-30',
          description: '30 TABLET in 1 BOTTLE',
          size: 30,
          status: 'active',
          isSample: false,
          marketingStartDate: '2020-01-01'
        },
        {
          product_ndc: '12345-678-92',
          package_ndc: '12345-678-60',
          description: '60 TABLET in 1 BOTTLE',
          size: 60,
          status: 'active',
          isSample: false,
          marketingStartDate: '2020-01-01'
        }
      ];

      const sorted = sortNDCsBySize(ndcs);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].size).toBe(30);
      expect(sorted[1].size).toBe(60);
      expect(sorted[2].size).toBe(90);
    });

    it('should handle decimal sizes correctly', () => {
      const ndcs: NDCPackageInfo[] = [
        {
          product_ndc: '12345-678-90',
          package_ndc: '12345-678-100',
          description: '100 mL in 1 VIAL',
          size: 100,
          status: 'active',
          isSample: false,
          marketingStartDate: '2020-01-01'
        },
        {
          product_ndc: '12345-678-91',
          package_ndc: '12345-678-5',
          description: '5 mL in 1 VIAL',
          size: 5,
          status: 'active',
          isSample: false,
          marketingStartDate: '2020-01-01'
        },
        {
          product_ndc: '12345-678-92',
          package_ndc: '12345-678-15.5',
          description: '15.5 mL in 1 VIAL',
          size: 15.5,
          status: 'active',
          isSample: false,
          marketingStartDate: '2020-01-01'
        }
      ];

      const sorted = sortNDCsBySize(ndcs);

      expect(sorted[0].size).toBe(5);
      expect(sorted[1].size).toBe(15.5);
      expect(sorted[2].size).toBe(100);
    });
  });

  describe('API Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.message).toBe('Network connection failed');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_404');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON');
        }
      });

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Package Size Extraction', () => {
    it('should extract integer sizes from descriptions', async () => {
      const mockResponse = {
        search_results: {
          drug_products: [
            {
              product_ndc: '12345-678-90',
              generic_name: 'Test Drug',
              brand_name: 'Test Brand',
              dosage_form: 'TABLET',
              route: ['ORAL'],
              marketing_status: 'Prescription',
              listing_expiration_date: '2025-12-31',
              marketing_start_date: '2020-01-01',
              application_number: 'NDA123456',
              labeler_name: 'Test Company',
              packaging: [
                {
                  package_ndc: '12345-678-100',
                  description: '100 TABLET in 1 BOTTLE',
                  start_marketing_date: '2020-01-01',
                  sample: false
                }
              ],
              active_ingredients: [
                {
                  name: 'Test Ingredient',
                  strength: '10 mg'
                }
              ],
              pharm_class: ['Test Class']
            }
          ]
        },
        meta: {
          total_results: 1,
          limit: 50,
          skip: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(true);
      expect(result.ndcs[0].packageSize).toBe(100);
    });

    it('should extract decimal sizes from descriptions', async () => {
      const mockResponse = {
        search_results: {
          drug_products: [
            {
              product_ndc: '12345-678-90',
              generic_name: 'Test Drug',
              brand_name: 'Test Brand',
              dosage_form: 'Solution',
              route: ['ORAL'],
              marketing_status: 'Prescription',
              listing_expiration_date: '2025-12-31',
              marketing_start_date: '2020-01-01',
              application_number: 'NDA123456',
              labeler_name: 'Test Company',
              packaging: [
                {
                  package_ndc: '12345-678-15.5',
                  description: '15.5 mL in 1 VIAL',
                  start_marketing_date: '2020-01-01',
                  sample: false
                }
              ],
              active_ingredients: [
                {
                  name: 'Test Ingredient',
                  strength: '10 mg/mL'
                }
              ],
              pharm_class: ['Test Class']
            }
          ]
        },
        meta: {
          total_results: 1,
          limit: 50,
          skip: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(true);
      expect(result.ndcs[0].packageSize).toBe(15.5);
    });

    it('should default to size 1 for unparseable descriptions', async () => {
      const mockResponse = {
        search_results: {
          drug_products: [
            {
              product_ndc: '12345-678-90',
              generic_name: 'Test Drug',
              brand_name: 'Test Brand',
              dosage_form: 'TABLET',
              route: ['ORAL'],
              marketing_status: 'Prescription',
              listing_expiration_date: '2025-12-31',
              marketing_start_date: '2020-01-01',
              application_number: 'NDA123456',
              labeler_name: 'Test Company',
              packaging: [
                {
                  package_ndc: '12345-678-001',
                  description: 'ONE TABLET in 1 BLISTER PACK',
                  start_marketing_date: '2020-01-01',
                  sample: false
                }
              ],
              active_ingredients: [
                {
                  name: 'Test Ingredient',
                  strength: '10 mg'
                }
              ],
              pharm_class: ['Test Class']
            }
          ]
        },
        meta: {
          total_results: 1,
          limit: 50,
          skip: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getNDCsByRxCUI('316074');

      expect(result.success).toBe(true);
      expect(result.ndcs[0].packageSize).toBe(1);
    });
  });
});