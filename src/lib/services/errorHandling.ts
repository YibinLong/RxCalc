import { toast } from '$lib/stores/toast';
import { logger, logApi, logUser, logCalculation, logValidation } from './logger';
import type { DrugNormalizationResult } from './rxnorm';
import type { NDCRetrievalResult } from './ndc';
import type { QuantityCalculationResult, OptimizedNDCResult } from './quantity';

export interface AppError {
  type: 'validation' | 'api' | 'network' | 'parsing' | 'calculation' | 'unknown';
  code?: string;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface NDCWarning {
  type: 'inactive_ndc' | 'limited_availability' | 'deprecated' | 'recalled';
  message: string;
  ndc: string;
  severity: 'low' | 'medium' | 'high';
}

class ErrorHandlingService {
  /**
   * Handle drug normalization errors with appropriate notifications
   */
  handleDrugNormalizationError(error: any, drugInput: string): void {
    let appError: AppError;

    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      appError = {
        type: 'network',
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to RxNorm API',
        details: error.message,
        recoverable: true,
        suggestedAction: 'Please check your internet connection and try again'
      };

      toast.error('Connection Error', appError.suggestedAction, {
        persistent: true,
        actions: [
          {
            label: 'Retry',
            action: () => {
              // The form will need to be re-submitted
              logUser.action('Retry drug normalization');
            },
            primary: true
          }
        ]
      });
    } else if (error?.status === 404) {
      appError = {
        type: 'api',
        code: 'DRUG_NOT_FOUND',
        message: `Drug "${drugInput}" not found in RxNorm database`,
        details: { drugInput },
        recoverable: true,
        suggestedAction: 'Check the spelling or try a different drug name or NDC'
      };

      toast.error('Drug Not Found', appError.suggestedAction, {
        persistent: true
      });
    } else if (error?.status === 429) {
      appError = {
        type: 'api',
        code: 'RATE_LIMIT',
        message: 'Too many requests to RxNorm API',
        details: error.message,
        recoverable: true,
        suggestedAction: 'Please wait a moment and try again'
      };

      toast.warning('Rate Limit', appError.suggestedAction, {
        duration: 8000
      });
    } else {
      appError = {
        type: 'unknown',
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred while looking up the drug',
        details: error,
        recoverable: true,
        suggestedAction: 'Please try again or contact support if the problem persists'
      };

      toast.error('Unexpected Error', appError.suggestedAction, {
        persistent: true
      });
    }

    logApi.error('Drug normalization failed', {
      error,
      drugInput,
      appError
    });
  }

  /**
   * Handle NDC retrieval errors
   */
  handleNDCRetrievalError(error: any, rxcui: string): void {
    let appError: AppError;

    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      appError = {
        type: 'network',
        code: 'NDC_NETWORK_ERROR',
        message: 'Unable to connect to FDA NDC Directory',
        details: error.message,
        recoverable: true,
        suggestedAction: 'Please check your internet connection and try again'
      };

      toast.error('FDA API Connection Error', appError.suggestedAction, {
        persistent: true
      });
    } else if (error?.status === 404 || error?.code === 'NO_NDCS_FOUND' || error?.code === 'UNSUPPORTED_SEARCH') {
      appError = {
        type: 'api',
        code: 'NO_NDC_FOUND',
        message: error?.code === 'UNSUPPORTED_SEARCH' ?
          'FDA NDC API has search limitations' :
          `No NDC information found for "${rxcui}"`,
        details: { rxcui, error },
        recoverable: true,
        suggestedAction: error?.code === 'UNSUPPORTED_SEARCH' ?
          'Try using the drug name instead of RxCUI' :
          'This medication may not be available in commercial packages'
      };

      toast.warning('Limited NDC Data', appError.suggestedAction, {
        duration: 6000
      });
    } else if (error?.code === 'NETWORK_ERROR') {
      appError = {
        type: 'network',
        code: 'NDC_NETWORK_ERROR',
        message: 'Unable to connect to FDA NDC Directory',
        details: error.message,
        recoverable: true,
        suggestedAction: 'Please check your internet connection and try again'
      };

      toast.error('FDA API Connection Error', appError.suggestedAction, {
        persistent: true
      });
    } else {
      appError = {
        type: 'api',
        code: 'NDC_API_ERROR',
        message: 'Failed to retrieve NDC information',
        details: error,
        recoverable: true,
        suggestedAction: 'Please try again or contact support'
      };

      toast.error('NDC Retrieval Error', appError.suggestedAction, {
        persistent: true
      });
    }

    logApi.error('NDC retrieval failed', {
      error,
      rxcui,
      appError
    });
  }

  /**
   * Handle quantity calculation errors
   */
  handleQuantityCalculationError(error: any, sig: string): void {
    const appError: AppError = {
      type: 'calculation',
      code: 'QUANTITY_CALC_ERROR',
      message: 'Failed to calculate dispense quantity',
      details: { sig, error },
      recoverable: true,
      suggestedAction: 'Please check the SIG format and try again'
    };

    toast.error('Calculation Error', appError.suggestedAction, {
      persistent: true,
      actions: [
        {
          label: 'Check SIG Format',
          action: () => {
            toast.info('SIG Format Help', 'Use formats like "Take 1 tablet twice daily" or "2 capsules by mouth every 8 hours"', {
              duration: 8000
            });
          },
          primary: false
        }
      ]
    });

    logCalculation.error('Quantity calculation failed', {
      error,
      sig,
      appError
    });
  }

  /**
   * Handle NDC optimization errors
   */
  handleNDCOptimizationError(error: any, quantity: number, availableNDCs: any[]): void {
    const appError: AppError = {
      type: 'calculation',
      code: 'NDC_OPTIMIZATION_ERROR',
      message: 'Failed to optimize NDC selection',
      details: { quantity, availableNDCs: availableNDCs.length, error },
      recoverable: true,
      suggestedAction: 'Please try again or contact support'
    };

    toast.error('Optimization Error', appError.suggestedAction, {
      persistent: true
    });

    logCalculation.error('NDC optimization failed', {
      error,
      quantity,
      availableNDCs: availableNDCs.length,
      appError
    });
  }

  /**
   * Handle inactive NDC warnings
   */
  handleInactiveNDCWarning(inactiveNDCs: any[]): void {
    const count = inactiveNDCs.length;

    toast.warning(
      `${count} Inactive NDC${count !== 1 ? 's' : ''} Detected`,
      `Some NDC options are marked as inactive by the FDA and may have limited availability.`,
      {
        persistent: true,
        actions: [
          {
            label: 'View Details',
            action: () => {
              logUser.action('View inactive NDC details', { inactiveNDCs });
            },
            primary: false
          },
          {
            label: 'Proceed with Caution',
            action: () => {
              toast.info('Please verify with your pharmacy before dispensing inactive NDCs', {
                duration: 6000
              });
            },
            primary: true
          }
        ]
      }
    );

    logger.warn('NDC', 'Inactive NDCs detected', inactiveNDCs);
  }

  /**
   * Handle general API errors
   */
  handleAPIError(error: any, context: string): void {
    const appError: AppError = {
      type: error?.response ? 'api' : 'network',
      code: error?.code || 'API_ERROR',
      message: `API error in ${context}`,
      details: error,
      recoverable: true,
      suggestedAction: 'Please try again or contact support if the problem persists'
    };

    if (error?.status >= 500) {
      toast.error('Server Error', 'The server is experiencing issues. Please try again later.', {
        persistent: true
      });
    } else if (error?.status >= 400) {
      toast.error('Request Error', appError.suggestedAction, {
        persistent: true
      });
    } else {
      toast.error('Connection Error', 'Please check your internet connection and try again.', {
        persistent: true
      });
    }

    logApi.error(`API error in ${context}`, {
      error,
      appError
    });
  }

  /**
   * Handle form validation errors
   */
  handleValidationError(errors: Record<string, string>): void {
    const errorCount = Object.keys(errors).length;
    const firstError = Object.values(errors)[0];

    toast.error(
      `${errorCount} Validation Error${errorCount !== 1 ? 's' : ''}`,
      firstError || 'Please check the form and correct any errors',
      {
        persistent: true,
        actions: [
          {
            label: 'Review Form',
            action: () => {
              // Focus on first error field
              const firstErrorField = Object.keys(errors)[0];
              const element = document.getElementById(firstErrorField);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
              }
            },
            primary: true
          }
        ]
      }
    );

    logValidation.error(errors);
  }

  /**
   * Show success notification for completed calculations
   */
  showCalculationSuccess(result: {
    totalPackages: number;
    waste: number;
    totalQuantity: number;
  }): void {
    toast.success(
      'Calculation Complete',
      `Optimal solution: ${result.totalPackages} package${result.totalPackages !== 1 ? 's' : ''} needed (${result.waste} units waste)`,
      {
        duration: 5000,
        actions: [
          {
            label: 'View Details',
            action: () => {
              // Scroll to results
              const resultsElement = document.querySelector('.ndc-display-container');
              if (resultsElement) {
                resultsElement.scrollIntoView({ behavior: 'smooth' });
              }
            },
            primary: true
          }
        ]
      }
    );
  }

  /**
   * Show progress notification for long-running operations
   */
  showProgressNotification(step: string, message: string): void {
    toast.info(step, message, {
      duration: 2000,
      persistent: false
    });
  }
}

// Export singleton instance
export const errorHandling = new ErrorHandlingService();

// Export convenience functions
export const showError = (title: string, message: string, options?: any) =>
  toast.error(title, message, options);

export const showWarning = (title: string, message: string, options?: any) =>
  toast.warning(title, message, options);

export const showSuccess = (title: string, message: string, options?: any) =>
  toast.success(title, message, options);

export const showInfo = (title: string, message: string, options?: any) =>
  toast.info(title, message, options);