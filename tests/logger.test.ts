import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, logApi, logUser, logCalculation, logValidation, logPerformance, LogLevel } from '../src/lib/services/logger';

// Mock console methods to capture log output
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  group: vi.fn(),
  groupCollapsed: vi.fn(),
  groupEnd: vi.fn()
};

const originalConsole = global.console;

describe('Logger Service', () => {
  beforeEach(() => {
    // Reset environment and mocks
    vi.clearAllMocks();

    // Mock console methods
    global.console = {
      ...originalConsole,
      debug: mockConsole.debug,
      info: mockConsole.info,
      warn: mockConsole.warn,
      error: mockConsole.error,
      group: mockConsole.group,
      groupCollapsed: mockConsole.groupCollapsed,
      groupEnd: mockConsole.groupEnd
    };
  });

  afterEach(() => {
    // Restore original console
    global.console = originalConsole;
  });

  describe('Environment-based logging', () => {
    it('should log only warnings and errors when debug mode is disabled', () => {
      logger.setDebugMode(false);

      logger.debug('TEST', 'Debug message');
      logger.info('TEST', 'Info message');
      logger.warn('TEST', 'Warning message');
      logger.error('TEST', 'Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should log all levels when debug mode is enabled', () => {
      logger.setDebugMode(true);

      logger.debug('TEST', 'Debug message');
      logger.info('TEST', 'Info message');
      logger.warn('TEST', 'Warning message');
      logger.error('TEST', 'Error message');

      expect(mockConsole.debug).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Convenience loggers', () => {
    beforeEach(() => {
      logger.setDebugMode(true);
    });

    it('should log API requests and responses', () => {
      logApi.request('GET', '/api/test', { data: 'test' });
      logApi.response('GET', '/api/test', 200, { result: 'success' });

      expect(mockConsole.debug).toHaveBeenCalledTimes(2);

      // Check the first call (API request)
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('GET /api/test'),
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          requestData: { data: 'test' }
        })
      );

      // Check the second call (API response)
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('GET /api/test - 200'),
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          status: 200,
          responseData: { result: 'success' }
        })
      );
    });

    it('should log user actions', () => {
      logUser.action('Form submitted', { field: 'value' });
      logUser.input('drug-name', 'Lisinopril');
      logUser.submission({ drug: 'Lisinopril', sig: 'Take 1 tablet daily' });

      expect(mockConsole.debug).toHaveBeenCalledTimes(3);

      // Check user action
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Form submitted'),
        { field: 'value' }
      );

      // Check user input
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Input: drug-name'),
        { value: 'Lisinopril' }
      );

      // Check user submission
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('Form submitted'),
        { drug: 'Lisinopril', sig: 'Take 1 tablet daily' }
      );
    });

    it('should log calculation steps', () => {
      logCalculation.start({ input: 'test' });
      logCalculation.step('Parsing SIG', { sig: 'Take 1 tablet daily' });
      logCalculation.result({ totalQuantity: 30 });

      expect(mockConsole.debug).toHaveBeenCalledTimes(3);

      // Check calculation start
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Starting calculation'),
        { input: 'test' }
      );

      // Check calculation step
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Parsing SIG'),
        { sig: 'Take 1 tablet daily' }
      );

      // Check calculation result
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('Calculation completed'),
        { totalQuantity: 30 }
      );
    });

    it('should log validation results', () => {
      logValidation.start({ field: 'value' });
      logValidation.field('drug-name', true);
      logValidation.field('sig', false, 'SIG is required');
      logValidation.success();

      expect(mockConsole.debug).toHaveBeenCalledTimes(3);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);

      // Check validation start
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Starting validation'),
        { field: 'value' }
      );

      // Check successful validation
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Validation passed for drug-name')
      );

      // Check failed validation warning
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed for sig: SIG is required')
      );

      // Check overall success
      expect(mockConsole.debug).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('Validation passed')
      );
    });

    it('should log performance metrics', () => {
      const endTimer = logPerformance.timer('API call');
      logPerformance.metric('Calculation', 150, { steps: 3 });

      expect(typeof endTimer).toBe('function');
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Calculation took 150ms'),
        expect.any(String), // color CSS
        { steps: 3 }
      );

      // Test timer function
      setTimeout(() => {
        endTimer();
        expect(mockConsole.debug).toHaveBeenCalledWith(
          expect.stringContaining('API call took'),
          expect.any(String), // color CSS
          expect.any(Number) // duration
        );
      }, 10);
    });
  });

  describe('Log formatting', () => {
    beforeEach(() => {
      logger.setDebugMode(true);
    });

    it('should format messages with timestamp, level, and category', () => {
      logger.info('API', 'Test message', { data: 'test' });

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/%c\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO \[API\] Test message$/),
        expect.stringMatching(/color: #[0-9a-fA-F]{6}/),
        { data: 'test' }
      );
    });

    it('should handle undefined data gracefully', () => {
      logger.error('TEST', 'Error message');

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/%c\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR \[TEST\] Error message$/),
        expect.stringMatching(/color: #[0-9a-fA-F]{6}/),
        ''
      );
    });
  });

  describe('Logger methods', () => {
    beforeEach(() => {
      logger.setDebugMode(true);
    });

    it('should provide debug status', () => {
      expect(logger.isDebugEnabled()).toBe(true);

      logger.setDebugMode(false);
      expect(logger.isDebugEnabled()).toBe(false);
    });

    it('should return current log level', () => {
      logger.setDebugMode(true);
      expect(logger.getLogLevel()).toBe(LogLevel.DEBUG);

      logger.setDebugMode(false);
      expect(logger.getLogLevel()).toBe(LogLevel.WARN);
    });

    it('should handle grouped logging', () => {
      const callback = vi.fn();
      logger.group('Test Group', false, callback);

      expect(mockConsole.group).toHaveBeenCalledWith('🔍 Test Group');
      expect(callback).toHaveBeenCalled();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('should handle collapsed grouped logging', () => {
      const callback = vi.fn();
      logger.group('Test Group', true, callback);

      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith('🔍 Test Group');
      expect(callback).toHaveBeenCalled();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });
  });

  describe('Timer functionality', () => {
    beforeEach(() => {
      logger.setDebugMode(true);
    });

    it('should create a working timer', (done) => {
      const endTimer = logger.timer('Test operation');

      expect(typeof endTimer).toBe('function');

      setTimeout(() => {
        endTimer();
        expect(mockConsole.debug).toHaveBeenCalledWith(
          expect.stringContaining('Test operation took'),
          expect.any(String), // color CSS
          expect.any(Number)  // duration
        );
        done();
      }, 5);
    });
  });
});