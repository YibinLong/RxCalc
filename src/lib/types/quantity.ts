// Types for quantity calculation logic

export interface DosageInstruction {
  amount: number;
  unit: string; // 'tablet', 'capsule', 'ml', 'mg', etc.
  frequency: number; // number of times per day
  timing?: string; // 'morning', 'evening', 'with food', etc.
  route?: string; // 'PO', 'IV', etc.
}

export interface ParsedSIG {
  originalSIG: string;
  dosageInstructions: DosageInstruction[];
  totalDailyDose: number;
  dailyFrequency: number;
  prn: boolean; // as needed
}

export interface QuantityCalculationResult {
  success: boolean;
  totalQuantity: number;
  unit: string;
  sig: ParsedSIG;
  daysSupply: number;
  error?: string;
}

export interface NDCCandidate {
  ndc: string;
  packageSize: number;
  packageDescription: string;
  status: 'active' | 'inactive';
  quantityNeeded: number;
  packagesRequired: number;
  efficiency: number; // lower is better (less waste)
}

export interface OptimizedNDCResult {
  success: boolean;
  candidates: NDCCandidate[];
  optimalCombination: NDCCandidate[];
  totalQuantity: number;
  totalPackages: number;
  waste: number;
  error?: string;
}