// Quantity calculation service for RxCalc

import type {
  ParsedSIG,
  DosageInstruction,
  QuantityCalculationResult,
  NDCCandidate,
  OptimizedNDCResult
} from '../types/quantity';
import type { NDCPackageInfo } from '../types/ndc';
import { logCalculation, logValidation, logPerformance } from './logger';

export class QuantityCalculator {

  /**
   * Parse SIG string to extract dosage instructions
   * Examples: "Take 1 tablet by mouth twice daily", "Take 2 capsules PO 3 times daily with food"
   */
  parseSIG(sig: string): ParsedSIG {
    logCalculation.start({ sig });
    logCalculation.step('Parsing SIG', { input: sig });

    const normalizedSIG = sig.toLowerCase().trim();
    const instructions: DosageInstruction[] = [];

    // Handle "as needed" (PRN)
    const isPRN = normalizedSIG.includes('as needed') ||
                  normalizedSIG.includes('prn') ||
                  normalizedSIG.includes('p.r.n.');

    // Extract dosage amount and unit
    const dosagePatterns = [
      /take\s+(\d+(?:\.\d+)?)\s+(tablet|tablets|capsule|capsules|pill|pills|ml|mg|g|dose)/gi,
      /(\d+(?:\.\d+)?)\s+(tablet|tablets|capsule|capsules|pill|pills|ml|mg|g|dose)\s+(?:take|by mouth|po|oral)/gi
    ];

    let totalDailyDose = 0;
    let dailyFrequency = 1;

    // Extract frequency first
    const frequency = this.extractFrequency(normalizedSIG);

    for (const pattern of dosagePatterns) {
      const matches = [...normalizedSIG.matchAll(pattern)];
      if (matches.length > 0) {
        for (const match of matches) {
          const amount = parseFloat(match[1]);
          const unit = match[2].replace(/s$/, ''); // remove plural

          instructions.push({
            amount,
            unit,
            frequency: frequency.timesPerDay,
            timing: frequency.timing,
            route: this.extractRoute(normalizedSIG)
          });

          totalDailyDose += amount * frequency.timesPerDay;
          dailyFrequency = Math.max(dailyFrequency, frequency.timesPerDay);
        }
        break;
      }
    }

    // Fallback for complex SIG parsing
    if (instructions.length === 0) {
      // Try to extract any number and assume it's the dose
      const numberMatch = normalizedSIG.match(/(\d+(?:\.\d+)?)/);

      // Handle written numbers like "One", "Two", etc.
      const writtenNumberMatch = normalizedSIG.match(/(one|two|three|four|five|six|seven|eight|nine|ten)/i);

      let parsedAmount = 0;
      if (numberMatch) {
        parsedAmount = parseFloat(numberMatch[1]);
      } else if (writtenNumberMatch) {
        const writtenNumbers: Record<string, number> = {
          'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };
        parsedAmount = writtenNumbers[writtenNumberMatch[1].toLowerCase()] || 1;
      }

      if (parsedAmount > 0) {
        instructions.push({
          amount: parsedAmount,
          unit: 'tablet', // default unit
          frequency: frequency.timesPerDay,
          timing: frequency.timing,
          route: this.extractRoute(normalizedSIG)
        });

        totalDailyDose = parsedAmount * frequency.timesPerDay;
        dailyFrequency = frequency.timesPerDay;
      }
    }

    logCalculation.result({
      originalSIG: sig,
      instructions,
      totalDailyDose,
      dailyFrequency,
      isPRN
    });

    return {
      originalSIG: sig,
      dosageInstructions: instructions,
      totalDailyDose,
      dailyFrequency,
      prn: isPRN
    };
  }

  /**
   * Calculate total dispense quantity based on SIG and days supply
   */
  calculateDispenseQuantity(sig: string, daysSupply: number): QuantityCalculationResult {
    const endTimer = logPerformance.timer('calculateDispenseQuantity');
    logCalculation.start({ sig, daysSupply });

    try {
      const parsedSIG = this.parseSIG(sig);

      if (parsedSIG.dosageInstructions.length === 0) {
        return {
          success: false,
          totalQuantity: 0,
          unit: '',
          sig: parsedSIG,
          daysSupply,
          error: 'Could not parse dosage instructions from SIG'
        };
      }

      // Calculate total quantity: daily dose × days supply
      const totalQuantity = parsedSIG.totalDailyDose * daysSupply;
      const unit = parsedSIG.dosageInstructions[0].unit;

      // Handle PRN medications - typically dispensed for less than the full days supply
      const adjustedQuantity = parsedSIG.prn ? Math.max(totalQuantity * 0.7, totalQuantity - 10) : totalQuantity;

      if (this.debug) {
        console.log('Quantity calculation result:', {
          totalQuantity: adjustedQuantity,
          unit,
          totalDailyDose: parsedSIG.totalDailyDose,
          daysSupply,
          isPRN: parsedSIG.prn
        });
      }

      return {
        success: true,
        totalQuantity: Math.ceil(adjustedQuantity), // Round up to ensure adequate supply
        unit,
        sig: parsedSIG,
        daysSupply
      };
    } catch (error) {
      return {
        success: false,
        totalQuantity: 0,
        unit: '',
        sig: this.parseSIG(sig), // Still return parsed SIG even on error
        daysSupply,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Optimize NDC selection based on calculated quantity
   */
  optimizeNDCSelection(
    quantityNeeded: number,
    availableNDCs: NDCPackageInfo[]
  ): OptimizedNDCResult {
    if (this.debug) {
      console.log('Optimizing NDC selection for quantity:', quantityNeeded);
      console.log('Available NDCs:', availableNDCs.length);
    }

    try {
      // Input validation
      if (!quantityNeeded || quantityNeeded <= 0 || !isFinite(quantityNeeded)) {
        return {
          success: false,
          candidates: [],
          optimalCombination: [],
          totalQuantity: 0,
          totalPackages: 0,
          waste: 0,
          error: 'Invalid quantity needed for optimization'
        };
      }

      if (!availableNDCs || !Array.isArray(availableNDCs) || availableNDCs.length === 0) {
        return {
          success: false,
          candidates: [],
          optimalCombination: [],
          totalQuantity: 0,
          totalPackages: 0,
          waste: 0,
          error: 'No NDC data available for optimization'
        };
      }

      // Filter for active NDCs only and validate package sizes
      const activeNDCs = availableNDCs.filter(ndc =>
        ndc.status === 'active' &&
        ndc.size &&
        ndc.size > 0 &&
        isFinite(ndc.size) &&
        ndc.package_ndc
      );

      if (activeNDCs.length === 0) {
        return {
          success: false,
          candidates: [],
          optimalCombination: [],
          totalQuantity: 0,
          totalPackages: 0,
          waste: 0,
          error: 'No valid active NDCs available for optimization'
        };
      }

      // Create candidates with efficiency calculations
      const candidates: NDCCandidate[] = activeNDCs.map(ndc => {
        const efficiency = this.calculateEfficiency(quantityNeeded, ndc.size);
        const packagesRequired = Math.ceil(quantityNeeded / ndc.size);

        return {
          ndc: ndc.package_ndc,
          packageSize: ndc.size,
          packageDescription: ndc.description || 'Package description unavailable',
          status: ndc.status,
          quantityNeeded,
          packagesRequired,
          efficiency
        };
      });

      // Sort by efficiency (least waste first)
      candidates.sort((a, b) => a.efficiency - b.efficiency);

      // Select optimal combination (could be multiple different package sizes)
      const optimalCombination = this.findOptimalCombination(quantityNeeded, candidates);

      const totalPackages = optimalCombination.reduce((sum, candidate) => sum + (candidate.packagesRequired || 0), 0);
      const totalProvided = optimalCombination.reduce((sum, candidate) => sum + ((candidate.packagesRequired || 0) * (candidate.packageSize || 0)), 0);
      const waste = Math.max(0, totalProvided - quantityNeeded);

      if (this.debug) {
        console.log('Optimization result:', {
          optimalCombination,
          totalPackages,
          totalProvided,
          waste,
          quantityNeeded
        });
      }

      return {
        success: true,
        candidates,
        optimalCombination,
        totalQuantity: quantityNeeded,
        totalPackages,
        waste
      };
    } catch (error) {
      return {
        success: false,
        candidates: [],
        optimalCombination: [],
        totalQuantity: quantityNeeded || 0,
        totalPackages: 0,
        waste: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private extractFrequency(text: string): { timesPerDay: number; timing?: string } {
    // Check patterns in order of specificity to avoid partial matches
    const frequencyPatterns = [
      { pattern: /three times daily|tid|t\.i\.d\./i, times: 3 },
      { pattern: /four times daily|qid|q\.i\.d\./i, times: 4 },
      { pattern: /twice daily|two times daily|bid|b\.i\.d\./i, times: 2 },
      { pattern: /once daily|once a day|qday|q\.d\./i, times: 1 }
    ];

    // Check specific patterns first
    for (const { pattern, times } of frequencyPatterns) {
      if (pattern.test(text)) {
        const timing = this.extractTiming(text);
        return { timesPerDay: times, timing };
      }
    }

    // Check for "every X hours"
    const hoursMatch = text.match(/every (\d+) hours/i);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      if (hours > 0) {
        const timing = this.extractTiming(text);
        return { timesPerDay: Math.ceil(24 / hours), timing };
      }
    }

    // Check for "X times daily"
    const timesDailyMatch = text.match(/(\d+) times daily/i);
    if (timesDailyMatch) {
      const times = parseInt(timesDailyMatch[1]);
      const timing = this.extractTiming(text);
      return { timesPerDay: times, timing };
    }

    // Default to daily (1 time) if no other pattern matches
    return { timesPerDay: 1 };
  }

  private extractTiming(text: string): string | undefined {
    const timingPatterns = [
      'with food',
      'with meals',
      'without food',
      'empty stomach',
      'morning',
      'evening',
      'night',
      'bedtime',
      'as needed',
      'prn'
    ];

    for (const timing of timingPatterns) {
      if (text.includes(timing)) {
        return timing;
      }
    }

    return undefined;
  }

  private extractRoute(text: string): string | undefined {
    const routePatterns = [
      { pattern: /by mouth|oral|po/i, route: 'PO' },
      { pattern: /intravenous|iv/i, route: 'IV' },
      { pattern: /intramuscular|im/i, route: 'IM' },
      { pattern: /topical/i, route: 'TOPICAL' },
      { pattern: /subcutaneous|subq|sc/i, route: 'SQ' }
    ];

    for (const { pattern, route } of routePatterns) {
      if (pattern.test(text)) {
        return route;
      }
    }

    return undefined;
  }

  private findOptimalCombination(
    quantityNeeded: number,
    candidates: NDCCandidate[]
  ): NDCCandidate[] {
    if (candidates.length === 0) {
      return [];
    }

    // Find the best single package size that minimizes waste
    let bestCandidate = candidates[0];
    let bestEfficiency = this.calculateEfficiency(quantityNeeded, bestCandidate.packageSize);

    for (const candidate of candidates) {
      const efficiency = this.calculateEfficiency(quantityNeeded, candidate.packageSize);
      if (efficiency < bestEfficiency) {
        bestEfficiency = efficiency;
        bestCandidate = candidate;
      }
    }

    // Update the packages required for the selected candidate
    bestCandidate.packagesRequired = Math.ceil(quantityNeeded / bestCandidate.packageSize);
    bestCandidate.efficiency = bestEfficiency;

    return [bestCandidate];
  }

  private calculateEfficiency(quantityNeeded: number, packageSize: number): number {
    const packagesRequired = Math.ceil(quantityNeeded / packageSize);
    const totalProvided = packagesRequired * packageSize;
    const waste = totalProvided - quantityNeeded;
    return waste / quantityNeeded; // Lower is better
  }
}

// Create singleton instance
export const quantityCalculator = new QuantityCalculator();

// Convenience functions
export function parseSIG(sig: string): ParsedSIG {
  return quantityCalculator.parseSIG(sig);
}

export function calculateDispenseQuantity(sig: string, daysSupply: number): QuantityCalculationResult {
  return quantityCalculator.calculateDispenseQuantity(sig, daysSupply);
}

export function optimizeNDCSelection(
  quantityNeeded: number,
  availableNDCs: NDCPackageInfo[]
): OptimizedNDCResult {
  return quantityCalculator.optimizeNDCSelection(quantityNeeded, availableNDCs);
}