// Types for FDA NDC Directory API integration

export interface NDCProduct {
  product_ndc: string;
  generic_name: string;
  brand_name: string;
  dosage_form: string;
  route: string[];
  marketing_status: string;
  listing_expiration_date: string;
  marketing_start_date: string;
  application_number: string;
  labeler_name: string;
  packaging: Array<{
    package_ndc: string;
    description: string;
    start_marketing_date: string;
    end_marketing_date?: string;
    sample: boolean;
  }>;
  active_ingredients: Array<{
    name: string;
    strength: string;
  }>;
  pharm_class: string[];
  dea_schedule?: string;
  rxcui?: string;
}

export interface NDCSearchResult {
  search_results: {
    drug_products: NDCProduct[];
  };
  meta: {
    total_results: number;
    limit: number;
    skip: number;
  };
}

export interface NDCRetrievalResult {
  success: boolean;
  rxcui?: string;
  ndcs: NDCPackageInfo[];
  error?: NDCError;
}

export interface NDCError {
  code: string;
  message: string;
  details?: string;
}

export interface NDCPackageInfo {
  product_ndc: string;
  package_ndc: string;
  description: string;
  size: number;
  status: 'active' | 'inactive';
  isSample: boolean;
  marketingStartDate: string;
  marketingEndDate?: string;
}