// Types for RxNorm API integration

export interface RxNormDrugLookupResult {
  rxcui: string;
  name: string;
  score?: number;
}

export interface RxNormAPIResponse {
  status?: {
    code: number;
    message: string;
  };
  idGroup?: {
    name?: string;
    rxnormId?: string[];
  };
  drugGroup?: {
    conceptGroup?: Array<{
      tty?: string;
      conceptProperties?: Array<{
        rxcui: string;
        name: string;
        synonym?: string;
        tty?: string;
        score?: number;
      }>;
    }>;
  };
}

export interface NDCStatusResult {
  rxcui: string;
  ndc: string;
  status: 'active' | 'inactive' | 'unknown';
}

export interface RxNormError {
  code: string;
  message: string;
  details?: string;
}

export interface DrugNormalizationResult {
  success: boolean;
  rxcui?: string;
  drugName?: string;
  error?: RxNormError;
}