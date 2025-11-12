/**
 * Centralized logging utility for the RxCalc application.
 *
 * This logger provides conditional logging based on the DEBUG environment variable.
 * When DEBUG is not set to 'true', only error and warn logs will be shown.
 * When DEBUG is 'true', all log levels including debug and info will be shown.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private isDebugMode: boolean;
  private logLevel: LogLevel;

  constructor() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.isDebugMode = import.meta.env?.DEBUG === 'true';
    } else {
      // Server-side environment (SvelteKit)
      this.isDebugMode = process?.env?.DEBUG === 'true';
    }

    // Set log level based on debug mode
    this.logLevel = this.isDebugMode ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * Set debug mode for testing purposes
   */
  setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
    this.logLevel = enabled ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, category: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelColors = ['#6B7280', '#3B82F6', '#F59E0B', '#EF4444'];
    const levelName = levelNames[entry.level];
    const levelColor = levelColors[entry.level];

    // Format the log message
    const formattedMessage = `[${entry.timestamp}] ${levelName} [${entry.category}] ${entry.message}`;

    // Choose the appropriate console method and styling
    switch (entry.level) {
      case LogLevel.DEBUG:
        if (this.isDebugMode && console.debug) {
          console.debug(`%c${formattedMessage}`, `color: ${levelColor}`, entry.data || '');
        }
        break;
      case LogLevel.INFO:
        if (console.info) {
          console.info(`%c${formattedMessage}`, `color: ${levelColor}`, entry.data || '');
        }
        break;
      case LogLevel.WARN:
        if (console.warn) {
          console.warn(`%c${formattedMessage}`, `color: ${levelColor}`, entry.data || '');
        }
        break;
      case LogLevel.ERROR:
        if (console.error) {
          console.error(`%c${formattedMessage}`, `color: ${levelColor}`, entry.data || '');
        }
        break;
    }
  }

  /**
   * Log debug information - only shown when DEBUG=true
   */
  debug(category: string, message: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.DEBUG, category, message, data);
    this.log(entry);
  }

  /**
   * Log informational messages - only shown when DEBUG=true
   */
  info(category: string, message: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.INFO, category, message, data);
    this.log(entry);
  }

  /**
   * Log warnings - always shown regardless of DEBUG setting
   */
  warn(category: string, message: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.WARN, category, message, data);
    this.log(entry);
  }

  /**
   * Log errors - always shown regardless of DEBUG setting
   */
  error(category: string, message: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.ERROR, category, message, data);
    this.log(entry);
  }

  /**
   * Log API request details
   */
  apiRequest(method: string, url: string, data?: any): void {
    this.debug('API', `${method} ${url}`, {
      method,
      url,
      requestData: data
    });
  }

  /**
   * Log API response details
   */
  apiResponse(method: string, url: string, status: number, data?: any): void {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
    const entry = this.formatMessage(level, 'API', `${method} ${url} - ${status}`, {
      method,
      url,
      status,
      responseData: data
    });
    this.log(entry);
  }

  /**
   * Log user actions
   */
  userAction(action: string, details?: any): void {
    this.debug('USER', action, details);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, details?: any): void {
    this.debug('PERF', `${operation} took ${duration}ms`, details);
  }

  /**
   * Log calculation steps
   */
  calculation(step: string, data?: any): void {
    this.debug('CALC', step, data);
  }

  /**
   * Log validation results
   */
  validation(field: string, result: boolean, message?: string): void {
    if (!result) {
      this.warn('VALIDATION', `Validation failed for ${field}: ${message}`);
    } else {
      this.debug('VALIDATION', `Validation passed for ${field}`);
    }
  }

  /**
   * Create a timer for performance measurement
   */
  timer(label: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.performance(label, duration);
    };
  }

  /**
   * Group related logs together
   */
  group(label: string, collapsed: boolean = false, callback: () => void): void {
    if (!this.shouldLog(LogLevel.DEBUG)) {
      callback();
      return;
    }

    if (console.group) {
      if (collapsed && console.groupCollapsed) {
        console.groupCollapsed(`🔍 ${label}`);
      } else {
        console.group(`🔍 ${label}`);
      }
    }

    callback();

    if (console.groupEnd) {
      console.groupEnd();
    }
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.isDebugMode;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for different log categories
export const logApi = {
  request: (method: string, url: string, data?: any) => logger.apiRequest(method, url, data),
  response: (method: string, url: string, status: number, data?: any) => logger.apiResponse(method, url, status, data),
  error: (message: string, data?: any) => logger.error('API', message, data)
};

export const logUser = {
  action: (action: string, details?: any) => logger.userAction(action, details),
  input: (field: string, value: any) => logger.debug('USER', `Input: ${field}`, { value }),
  submission: (data: any) => logger.debug('USER', 'Form submitted', data)
};

export const logCalculation = {
  start: (input: any) => logger.debug('CALC', 'Starting calculation', input),
  step: (step: string, data?: any) => logger.calculation(step, data),
  result: (result: any) => logger.debug('CALC', 'Calculation completed', result),
  error: (error: any) => logger.error('CALC', 'Calculation failed', error)
};

export const logValidation = {
  start: (data: any) => logger.debug('VALIDATION', 'Starting validation', data),
  field: (field: string, result: boolean, message?: string) => logger.validation(field, result, message),
  success: () => logger.debug('VALIDATION', 'Validation passed'),
  error: (errors: any) => logger.warn('VALIDATION', 'Validation failed', errors)
};

export const logPerformance = {
  timer: (label: string) => logger.timer(label),
  metric: (operation: string, duration: number, details?: any) => logger.performance(operation, duration, details)
};

export default logger;