// Tests for quantity calculation logic

import { describe, it, expect, beforeEach } from 'vitest';
import {
  quantityCalculator,
  parseSIG,
  calculateDispenseQuantity,
  optimizeNDCSelection
} from '../src/lib/services/quantity';
import type { NDCPackageInfo } from '../src/lib/types/ndc';

describe('Quantity Calculator', () => {
  beforeEach(() => {
    // Mock environment variable for testing
    process.env.DEBUG = 'false';
  });

  describe('SIG Parsing', () => {
    it('should parse simple SIG - "Take 1 tablet by mouth twice daily"', () => {
      const result = parseSIG('Take 1 tablet by mouth twice daily');

      expect(result.originalSIG).toBe('Take 1 tablet by mouth twice daily');
      expect(result.dosageInstructions).toHaveLength(1);
      expect(result.dosageInstructions[0].amount).toBe(1);
      expect(result.dosageInstructions[0].unit).toBe('tablet');
      expect(result.dosageInstructions[0].frequency).toBe(2);
      expect(result.totalDailyDose).toBe(2);
      expect(result.dailyFrequency).toBe(2);
      expect(result.prn).toBe(false);
    });

    it('should parse SIG with PRN and explicit frequency - "Take 1 tablet by mouth twice daily as needed"', () => {
      const result = parseSIG('Take 1 tablet by mouth twice daily as needed');

      expect(result.originalSIG).toBe('Take 1 tablet by mouth twice daily as needed');
      expect(result.dosageInstructions).toHaveLength(1);
      expect(result.dosageInstructions[0].amount).toBe(1);
      expect(result.dosageInstructions[0].unit).toBe('tablet');
      expect(result.dosageInstructions[0].frequency).toBe(2); // "twice daily" => BID
      expect(result.totalDailyDose).toBe(2);
      expect(result.dailyFrequency).toBe(2);
      expect(result.prn).toBe(true);
    });

    it('should parse SIG with "bid" - "Take 2 capsules PO BID"', () => {
      const result = parseSIG('Take 2 capsules PO BID');

      expect(result.dosageInstructions).toHaveLength(1);
      expect(result.dosageInstructions[0].amount).toBe(2);
      expect(result.dosageInstructions[0].unit).toBe('capsule');
      expect(result.dosageInstructions[0].frequency).toBe(2);
      expect(result.totalDailyDose).toBe(4);
    });

    it('should parse SIG with timing - "Take 1 tablet by mouth three times daily with food"', () => {
      const result = parseSIG('Take 1 tablet by mouth three times daily with food');

      expect(result.dosageInstructions[0].timing).toBe('with food');
      expect(result.dosageInstructions[0].frequency).toBe(3);
    });

    it('should parse PRN medications', () => {
      const result = parseSIG('Take 1 tablet by mouth as needed for pain');

      expect(result.prn).toBe(true);
      expect(result.dosageInstructions[0].frequency).toBe(1);
    });

    it('should parse TID frequency', () => {
      const result = parseSIG('Take 1 tablet TID');

      expect(result.dosageInstructions[0].frequency).toBe(3);
      expect(result.totalDailyDose).toBe(3);
    });

    it('should parse QID frequency', () => {
      const result = parseSIG('Take 2 tablets QID');

      expect(result.dosageInstructions[0].frequency).toBe(4);
      expect(result.totalDailyDose).toBe(8);
    });

    it('should handle complex dosing schedules', () => {
      const result = parseSIG('Take 1 tablet by mouth every 6 hours');

      expect(result.dosageInstructions[0].frequency).toBe(4); // 24/6 = 4
    });

    it('should handle fallback parsing for unusual formats', () => {
      const result = parseSIG('One tablet twice daily');

      expect(result.dosageInstructions).toHaveLength(1);
      expect(result.dosageInstructions[0].amount).toBe(1);
      expect(result.dosageInstructions[0].unit).toBe('tablet');
    });

    it('should return empty instructions for unparseable SIG', () => {
      const result = parseSIG('Invalid SIG format');

      expect(result.dosageInstructions).toHaveLength(0);
      expect(result.totalDailyDose).toBe(0);
    });
  });

  describe('Quantity Calculation', () => {
    it('should calculate simple quantity - 1 tablet BID for 30 days', () => {
      const result = calculateDispenseQuantity('Take 1 tablet by mouth twice daily', 30);

      expect(result.success).toBe(true);
      expect(result.totalQuantity).toBe(60); // 1 × 2 × 30
      expect(result.unit).toBe('tablet');
      expect(result.sig.totalDailyDose).toBe(2);
    });

    it('should calculate PRN quantity with explicit frequency - 1 tablet BID PRN for 30 days', () => {
      const result = calculateDispenseQuantity('Take 1 tablet by mouth twice daily as needed', 30);

      expect(result.success).toBe(true);
      // Base would be 60, PRN adjustment uses max(60*0.7=42, 60-10=50) => 50
      expect(result.totalQuantity).toBe(50);
      expect(result.sig.prn).toBe(true);
      expect(result.sig.totalDailyDose).toBe(2);
      expect(result.unit).toBe('tablet');
    });

    it('should calculate quantity with fractional doses', () => {
      const result = calculateDispenseQuantity('Take 0.5 tablet by mouth twice daily', 30);

      expect(result.success).toBe(true);
      expect(result.totalQuantity).toBe(30); // 0.5 × 2 × 30 = 30
      expect(result.sig.dosageInstructions[0].amount).toBe(0.5);
    });

    it('should handle PRN medications with reduced quantity', () => {
      const result = calculateDispenseQuantity('Take 1 tablet by mouth as needed', 30);

      expect(result.success).toBe(true);
      // Should be less than full 30 tablets due to PRN adjustment
      expect(result.totalQuantity).toBeLessThan(30);
      expect(result.totalQuantity).toBeGreaterThanOrEqual(20);
    });

    it('should handle complex dosing - 2 capsules TID for 14 days', () => {
      const result = calculateDispenseQuantity('Take 2 capsules by mouth three times daily', 14);

      expect(result.success).toBe(true);
      expect(result.totalQuantity).toBe(84); // 2 × 3 × 14
      expect(result.unit).toBe('capsule');
    });

    it('should return error for unparseable SIG', () => {
      const result = calculateDispenseQuantity('Invalid SIG', 30);

      expect(result.success).toBe(false);
      expect(result.totalQuantity).toBe(0);
      expect(result.error).toContain('Could not parse dosage instructions');
    });

    it('should handle zero days supply', () => {
      const result = calculateDispenseQuantity('Take 1 tablet daily', 0);

      expect(result.success).toBe(true);
      expect(result.totalQuantity).toBe(0);
    });
  });

  describe('NDC Optimization', () => {
    const mockNDCs: NDCPackageInfo[] = [
      {
        product_ndc: '12345-101-01',
        package_ndc: '12345-101-01',
        description: '100 tablets in 1 bottle',
        size: 100,
        status: 'active',
        isSample: false,
        marketingStartDate: '2020-01-01'
      },
      {
        product_ndc: '12345-101-02',
        package_ndc: '12345-101-02',
        description: '30 tablets in 1 bottle',
        size: 30,
        status: 'active',
        isSample: false,
        marketingStartDate: '2020-01-01'
      },
      {
        product_ndc: '12345-101-03',
        package_ndc: '12345-101-03',
        description: '500 tablets in 1 bottle',
        size: 500,
        status: 'active',
        isSample: false,
        marketingStartDate: '2020-01-01'
      },
      {
        product_ndc: '12345-101-04',
        package_ndc: '12345-101-04',
        description: '60 tablets in 1 bottle',
        size: 60,
        status: 'inactive', // Should be filtered out
        isSample: false,
        marketingStartDate: '2020-01-01',
        marketingEndDate: '2022-01-01'
      }
    ];

    it('should select optimal NDC for 60 tablets', () => {
      const result = optimizeNDCSelection(60, mockNDCs);

      expect(result.success).toBe(true);
      expect(result.candidates).toHaveLength(3); // Only active NDCs

      // Should prefer 60-tablet or closest size package
      const optimal = result.optimalCombination[0];
      expect(optimal.packageSize).toBe(100); // 100 is most efficient for 60 tablets
      expect(optimal.packagesRequired).toBe(1);
    });

    it('should select multiple packages for large quantities', () => {
      const result = optimizeNDCSelection(250, mockNDCs);

      expect(result.success).toBe(true);
      expect(result.optimalCombination[0].packagesRequired).toBe(3); // 3 × 100 = 300 tablets
    });

    it('should handle small quantities efficiently', () => {
      const result = optimizeNDCSelection(15, mockNDCs);

      expect(result.success).toBe(true);
      // Should prefer 30-tablet package over 100-tablet for small quantity
      const optimal = result.optimalCombination[0];
      expect(optimal.packagesRequired).toBe(1);
      expect(optimal.efficiency).toBeLessThan(1); // There will be some waste
    });

    it('should return error when no active NDCs available', () => {
      const inactiveOnly: NDCPackageInfo[] = [
        {
          product_ndc: '12345-101-04',
          package_ndc: '12345-101-04',
          description: '60 tablets in 1 bottle',
          size: 60,
          status: 'inactive',
          isSample: false,
          marketingStartDate: '2020-01-01',
          marketingEndDate: '2022-01-01'
        }
      ];

      const result = optimizeNDCSelection(60, inactiveOnly);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active NDCs available');
    });

    it('should calculate waste correctly', () => {
      const result = optimizeNDCSelection(45, mockNDCs);

      expect(result.success).toBe(true);
      // For 45 tablets, optimal should be 100-tablet package
      expect(result.waste).toBe(55); // 100 - 45
      expect(result.totalPackages).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    const mockNDCs: NDCPackageInfo[] = [
      {
        product_ndc: '11111-222-33',
        package_ndc: '11111-222-33',
        description: '30 tablets in 1 bottle',
        size: 30,
        status: 'active',
        isSample: false,
        marketingStartDate: '2020-01-01'
      },
      {
        product_ndc: '11111-222-34',
        package_ndc: '11111-222-34',
        description: '90 tablets in 1 bottle',
        size: 90,
        status: 'active',
        isSample: false,
        marketingStartDate: '2020-01-01'
      }
    ];

    it('should handle complete workflow - SIG parsing to NDC selection', () => {
      const quantityResult = calculateDispenseQuantity('Take 1 tablet BID', 30);
      expect(quantityResult.success).toBe(true);
      expect(quantityResult.totalQuantity).toBe(60);

      const ndcResult = optimizeNDCSelection(quantityResult.totalQuantity, mockNDCs);
      expect(ndcResult.success).toBe(true);
      expect(ndcResult.optimalCombination[0].packageSize).toBe(90);
    });

    it('should handle edge case - very large prescription', () => {
      const quantityResult = calculateDispenseQuantity('Take 2 tablets TID', 180); // 6 months
      expect(quantityResult.success).toBe(true);
      expect(quantityResult.totalQuantity).toBe(1080); // 2 × 3 × 180

      const ndcResult = optimizeNDCSelection(quantityResult.totalQuantity, mockNDCs);
      expect(ndcResult.success).toBe(true);
      expect(ndcResult.totalPackages).toBeGreaterThan(10); // Will need many packages
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed SIG gracefully', () => {
      const result = calculateDispenseQuantity('', 30);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle negative days supply', () => {
      const result = calculateDispenseQuantity('Take 1 tablet daily', -5);

      expect(result.success).toBe(true); // Still calculates but with 0 or negative quantity
      expect(result.totalQuantity).toBeLessThanOrEqual(0);
    });

    it('should handle empty NDC list', () => {
      const result = optimizeNDCSelection(30, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active NDCs available');
    });
  });
});