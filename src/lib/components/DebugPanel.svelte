<script lang="ts">
  import { logger, logApi, logUser, logCalculation, logValidation, logPerformance } from '../services/logger';

  let debugMode = logger.isDebugEnabled();

  function testAllLogLevels() {
    logger.debug('DEBUG_TEST', 'This is a debug message', { test: true });
    logger.info('INFO_TEST', 'This is an info message', { level: 'info' });
    logger.warn('WARN_TEST', 'This is a warning message', { warning: true });
    logger.error('ERROR_TEST', 'This is an error message', { error: 'test error' });
  }

  function testConvenienceLoggers() {
    // Test API logging
    logApi.request('POST', '/api/test', { drug: 'Lisinopril' });
    logApi.response('POST', '/api/test', 200, { success: true });

    // Test user logging
    logUser.action('Test button clicked', { component: 'DebugPanel' });
    logUser.input('drug-name', 'Aspirin');

    // Test calculation logging
    logCalculation.start({ sig: 'Take 1 tablet daily', days: 30 });
    logCalculation.step('Parse dosage', { dose: 1, frequency: 'daily' });
    logCalculation.result({ totalQuantity: 30 });

    // Test validation logging
    logValidation.start({ field: 'drug' });
    logValidation.field('drug', true);
    logValidation.field('sig', false, 'SIG is required');

    // Test performance logging
    const endTimer = logPerformance.timer('Test operation');
    setTimeout(() => {
      endTimer();
    }, 100);
  }

  function testGroupedLogging() {
    logger.group('API Request Flow', false, () => {
      logApi.request('GET', '/api/drugs/lisinopril');
      logger.debug('API', 'Processing request...');
      logApi.response('GET', '/api/drugs/lisinopril', 200, { drug: 'Lisinopril' });
      logger.debug('API', 'Response processed successfully');
    });
  }

  function testErrorLogging() {
    logApi.error('Test API error', {
      code: 'TEST_ERROR',
      message: 'This is a test error',
      details: { endpoint: '/test', method: 'GET' }
    });

    logCalculation.error('Test calculation error', {
      step: 'quantity_calculation',
      error: 'Invalid SIG format'
    });
  }
</script>

<div class="debug-panel" style="background: #f5f5f5; border: 1px solid #ccc; padding: 20px; margin: 20px 0; border-radius: 8px;">
  <h3>🔍 Debug Panel - Logger Testing</h3>
  <p>Debug Mode: <strong>{debugMode ? 'Enabled' : 'Disabled'}</strong></p>

  <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
    <button on:click={testAllLogLevels} style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Test All Log Levels
    </button>

    <button on:click={testConvenienceLoggers} style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Test Convenience Loggers
    </button>

    <button on:click={testGroupedLogging} style="padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">
      Test Grouped Logging
    </button>

    <button on:click={testErrorLogging} style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Test Error Logging
    </button>
  </div>

  <div style="margin-top: 15px; padding: 10px; background: #e9ecef; border-radius: 4px;">
    <h4>Instructions:</h4>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Open your browser's developer console (F12)</li>
      <li>Click the buttons above to test different logging functions</li>
      <li>When DEBUG=true, you'll see all log levels</li>
      <li>When DEBUG=false or unset, you'll only see warnings and errors</li>
      <li>Check the console for formatted log messages with timestamps</li>
    </ul>
  </div>
</div>

<style>
  .debug-panel button:hover {
    opacity: 0.9;
  }

  .debug-panel button:active {
    transform: translateY(1px);
  }
</style>