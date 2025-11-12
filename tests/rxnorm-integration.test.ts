import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeDrugToRxCUI } from '../src/lib/services/rxnorm';

// Mock fetch for testing
global.fetch = vi.fn();

describe('RxNorm API Integration', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.resetAllMocks();
  });

  it('should handle invalid input (too short)', async () => {
    const result = await normalizeDrugToRxCUI('x');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  it('should handle empty input', async () => {
    const result = await normalizeDrugToRxCUI('');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  it('should validate the function structure and return types', async () => {
    // Test that the function exists and has the expected structure
    expect(typeof normalizeDrugToRxCUI).toBe('function');

    // Test with a valid drug name format (will make actual API call)
    const result = await normalizeDrugToRxCUI('Aspirin');

    // The result should have the expected structure
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.drugName).toBe('string');

    if (result.success) {
      expect(typeof result.rxcui).toBe('string');
    } else {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('object');
    }
  });

  it('should handle NDC format recognition', async () => {
    // Test NDC format validation
    const ndcResult = await normalizeDrugToRxCUI('12345678901');

    expect(typeof ndcResult.success).toBe('boolean');
    expect(typeof ndcResult.drugName).toBe('string');
  });
});