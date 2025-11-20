<script lang="ts">
  import { normalizeDrugToRxCUI, type DrugNormalizationResult } from '$lib/services/rxnorm';
  import { getNDCsByRxCUI, searchNDCsByDrugName, searchNDCByCode, type NDCRetrievalResult } from '$lib/services/ndc';
  import { calculateDispenseQuantity, optimizeNDCSelection, type QuantityCalculationResult, type OptimizedNDCResult } from '$lib/services/quantity';
  import { errorHandling } from '$lib/services/errorHandling';
  import { logger, logApi, logUser, logCalculation } from '$lib/services/logger';
  import NDCResults from '$lib/components/NDCResults.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import DebugPanel from '$lib/components/DebugPanel.svelte';

  // Form state
  let drugInput = '';
  let sig = '';
  let daysSupply = '';
  let errors: Record<string, string> = {};
  let isSubmitting = false;
  let submitMessage = '';
  let submitMessageType: 'success' | 'error' | 'info' | '';
  
  // SIG input mode - default to AI
  let sigMode: 'ai' | 'manual' = 'ai';
  let manualTablets = '';
  let manualTimesPerDay = '';

  // API results state
  let normalizationResult: DrugNormalizationResult | null = null;
  let ndcResult: NDCRetrievalResult | null = null;
  let quantityResult: QuantityCalculationResult | null = null;
  let optimizedNDCResult: OptimizedNDCResult | null = null;
  let showApiResults = false;

  // Types for our form data
  interface PrescriptionData {
    drugInput: string;
    sig: string;
    daysSupply: number;
    timestamp: string;
  }

  function validateForm(): boolean {
    errors = {};

    // Drug input validation
    if (!drugInput.trim()) {
      errors.drugInput = 'Drug name or NDC is required';
    } else if (drugInput.trim().length < 2) {
      errors.drugInput = 'Drug name must be at least 2 characters';
    }

    // SIG validation - different for AI vs Manual mode
    if (sigMode === 'ai') {
      if (!sig.trim()) {
        errors.sig = 'SIG (instructions) is required';
      } else if (sig.trim().length < 5) {
        errors.sig = 'SIG must be more detailed (at least 5 characters)';
      }
    } else {
      // Manual mode validation
      if (!manualTablets.trim()) {
        errors.manualTablets = 'Tablets/Units per dose is required';
      } else if (isNaN(Number(manualTablets)) || Number(manualTablets) <= 0) {
        errors.manualTablets = 'Must be a positive number';
      }
      
      if (!manualTimesPerDay.trim()) {
        errors.manualTimesPerDay = 'Times per day is required';
      } else if (isNaN(Number(manualTimesPerDay)) || Number(manualTimesPerDay) <= 0) {
        errors.manualTimesPerDay = 'Must be a positive number';
      }
    }

    // Days supply validation
    if (!daysSupply.trim()) {
      errors.daysSupply = 'Days supply is required';
    } else if (isNaN(Number(daysSupply))) {
      errors.daysSupply = 'Days supply must be a valid number';
    } else if (Number(daysSupply) <= 0) {
      errors.daysSupply = 'Days supply must be a positive number';
    } else if (Number(daysSupply) > 365) {
      errors.daysSupply = 'Days supply cannot exceed 365 days';
    } else if (!Number.isInteger(Number(daysSupply))) {
      errors.daysSupply = 'Days supply must be a whole number';
    }

    return Object.keys(errors).length === 0;
  }

  function validateNDCFormat(ndc: string): boolean {
    // Basic NDC format validation (can be enhanced)
    const ndcPattern = /^\d{5}-\d{4}-\d{2}$|^\d{11}$|^\d{5}-\d{3}-\d{2}$/;
    return ndcPattern.test(ndc.replace(/[^0-9-]/g, ''));
  }

  async function handleSubmit() {
    logUser.action('Form submission started', { drugInput, sig, daysSupply });

    // Clear previous messages and results
    submitMessage = '';
    submitMessageType = '';
    showApiResults = false;
    normalizationResult = null;
    ndcResult = null;
    quantityResult = null;
    optimizedNDCResult = null;

    if (!validateForm()) {
      // Use enhanced error handling for validation errors
      errorHandling.handleValidationError(errors);
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    isSubmitting = true;

    try {
      const cleanedDrugInput = drugInput.trim();
      const cleanedDaysSupply = Number(daysSupply.trim());
      let cleanedSig = '';
      let parsedSigData: { amount: number; frequency: number; unit: string } | null = null;

      // Handle SIG parsing based on mode
      if (sigMode === 'ai') {
        // AI Mode - parse SIG text with AI
        cleanedSig = sig.trim();
        
        submitMessage = 'Processing SIG with AI...';
        submitMessageType = 'info';
        
        try {
          const sigResponse = await fetch('/api/ai/sig', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sig: cleanedSig })
          });
          
          const sigData = await sigResponse.json();
          
          if (!sigData.success) {
            // Show error toast notification
            errorHandling.handleAPIError(new Error(sigData.error || 'Could not parse SIG with AI'), 'AI SIG Parsing');
            submitMessage = `❌ ${sigData.error || 'Failed to parse SIG'}. Try manual mode.`;
            submitMessageType = 'error';
            isSubmitting = false;
            return;
          }
          
          parsedSigData = {
            amount: sigData.amount,
            frequency: sigData.frequency,
            unit: sigData.unit
          };
          
          logUser.action('AI SIG parsed successfully', parsedSigData);
          
        } catch (error) {
          console.error('Error calling AI SIG endpoint:', error);
          errorHandling.handleAPIError(error, 'AI SIG Service');
          submitMessage = '❌ Failed to process SIG with AI. Try manual mode.';
          submitMessageType = 'error';
          isSubmitting = false;
          return;
        }
        
      } else {
        // Manual Mode - use direct numeric inputs
        const tablets = Number(manualTablets.trim());
        const timesPerDay = Number(manualTimesPerDay.trim());
        
        parsedSigData = {
          amount: tablets,
          frequency: timesPerDay,
          unit: 'tablet'
        };
        
        // Construct a readable SIG for logging
        cleanedSig = `Take ${tablets} tablet${tablets !== 1 ? 's' : ''} ${timesPerDay} time${timesPerDay !== 1 ? 's' : ''} daily`;
        
        logUser.action('Manual SIG input used', parsedSigData);
      }

      // Check if input looks like an NDC
      const isLikelyNDC = validateNDCFormat(cleanedDrugInput);

      const formData: PrescriptionData = {
        drugInput: cleanedDrugInput,
        sig: cleanedSig,
        daysSupply: cleanedDaysSupply,
        timestamp: new Date().toISOString()
      };

      // Step 1: Call RxNorm API to normalize drug to RxCUI
      logger.group('Drug Normalization', false, () => {
        logUser.submission(formData);
        logApi.request('POST', '/normalize', {
          drugInput: cleanedDrugInput,
          isLikelyNDC,
          drugInputType: isLikelyNDC ? 'NDC' : 'Drug Name'
        });
      });

      submitMessage = `Step 1: Normalizing ${isLikelyNDC ? 'NDC' : 'drug name'}...`;
      submitMessageType = 'info';

      // Show progress notification
      errorHandling.showProgressNotification('Step 1', `Normalizing ${isLikelyNDC ? 'NDC' : 'drug name'}...`);

      const normResult = await normalizeDrugToRxCUI(cleanedDrugInput);
      normalizationResult = normResult;

      if (!normResult.success || !normResult.rxcui) {
        // Failed to normalize - use enhanced error handling
        const error = normResult.error || new Error('Failed to normalize drug');
        errorHandling.handleDrugNormalizationError(error, cleanedDrugInput);

        submitMessage = `❌ ${error.message || 'Failed to normalize drug'}`;
        submitMessageType = 'error';
        showApiResults = false;

        console.error('Drug normalization failed:', {
          original: cleanedDrugInput,
          error: normResult.error
        });
        return;
      }

      // Successfully normalized to RxCUI
      logApi.response('POST', '/normalize', 200, {
        original: cleanedDrugInput,
        rxcui: normResult.rxcui,
        drugName: normResult.drugName,
        inputType: isLikelyNDC ? 'NDC' : 'Drug Name'
      });

      submitMessage = `✓ Found RxCUI: ${normResult.rxcui} for "${normResult.drugName}". Fetching NDCs...`;
      submitMessageType = 'info';

      // Show progress notification for NDC retrieval
      errorHandling.showProgressNotification('Step 2', `Found RxCUI: ${normResult.rxcui}. Fetching NDCs...`);

      // Step 2: Get NDCs - optimized approach based on input type
      console.log('Step 2: Fetching NDCs for:', normResult.rxcui ? normResult.rxcui : normResult.drugName);

      let ndcData: NDCRetrievalResult;

      // Check if input was an NDC and use direct FDA NDC search for better results
      if (isLikelyNDC) {
        console.log('Input appears to be NDC, using direct FDA NDC search:', cleanedDrugInput);
        ndcData = await searchNDCByCode(cleanedDrugInput);
      } else {
        // For drug names, try RxCUI approach first, then fallback to drug name search
        ndcData = await getNDCsByRxCUI(normResult.rxcui || '');

        // If RxCUI approach fails, try direct drug name search with FDA API
        if (!ndcData.success || ndcData.ndcs.length === 0) {
          console.log('RxCUI approach failed, trying drug name search:', normResult.drugName);
          ndcData = await searchNDCsByDrugName(normResult.drugName);
        }
      }

      ndcResult = ndcData;

      if (!ndcData.success || ndcData.ndcs.length === 0) {
        // Use enhanced error handling for NDC retrieval failures
        const error = ndcData.error || new Error('No NDCs found');
        errorHandling.handleNDCRetrievalError(error, normResult.drugName);

        submitMessage = `❌ No NDCs found for this medication`;
        submitMessageType = 'error';
        showApiResults = true; // Show what we have so far
        isSubmitting = false; // Ensure form is re-enabled
        return;
      }

      console.log('NDCs retrieved successfully:', {
        rxcui: normResult.rxcui,
        ndcCount: ndcData.ndcs.length,
        activeNDCs: ndcData.ndcs.filter(ndc => ndc.status === 'active').length
      });

      submitMessage = `✓ Found ${ndcData.ndcs.length} NDC options. Calculating quantities...`;
      submitMessageType = 'info';

      // Show progress notification for quantity calculation
      errorHandling.showProgressNotification('Step 3', `Found ${ndcData.ndcs.length} NDCs. Calculating quantities...`);

      // Step 3: Calculate dispense quantity from parsed SIG and days supply
      console.log('Step 3: Calculating dispense quantity');

      // Use the parsed SIG data directly or fall back to string parsing
      let quantityData: QuantityCalculationResult;
      
      if (parsedSigData) {
        // Use AI or manual parsed data
        const totalDailyDose = parsedSigData.amount * parsedSigData.frequency;
        const totalQuantity = totalDailyDose * cleanedDaysSupply;
        
        quantityData = {
          success: true,
          totalQuantity: Math.ceil(totalQuantity),
          unit: parsedSigData.unit,
          sig: {
            originalSIG: cleanedSig,
            dosageInstructions: [{
              amount: parsedSigData.amount,
              unit: parsedSigData.unit,
              frequency: parsedSigData.frequency,
              timing: undefined,
              route: undefined
            }],
            totalDailyDose,
            dailyFrequency: parsedSigData.frequency,
            prn: false
          },
          daysSupply: cleanedDaysSupply
        };
      } else {
        // Fallback to rule-based parsing (shouldn't happen with new flow)
        quantityData = calculateDispenseQuantity(cleanedSig, cleanedDaysSupply);
      }
      
      quantityResult = quantityData;

      if (!quantityData.success) {
        // Use enhanced error handling for quantity calculation
        const error = new Error(quantityData.error || 'Failed to calculate quantity');
        errorHandling.handleQuantityCalculationError(error, cleanedSig);

        submitMessage = `❌ Failed to calculate quantity: ${quantityData.error}`;
        submitMessageType = 'error';
        showApiResults = true;
        isSubmitting = false; // Ensure form is re-enabled
        return;
      }

      console.log('Quantity calculated successfully:', {
        totalQuantity: quantityData.totalQuantity,
        unit: quantityData.unit,
        daysSupply: quantityData.daysSupply
      });

      submitMessage = `✓ Need ${quantityData.totalQuantity} ${quantityData.unit}s. Optimizing NDC selection...`;
      submitMessageType = 'info';

      // Show progress notification for optimization
      errorHandling.showProgressNotification('Step 4', `Need ${quantityData.totalQuantity} ${quantityData.unit}s. Optimizing NDC selection...`);

      // Step 4: Optimize NDC selection
      console.log('Step 4: Optimizing NDC selection');

      const optimizedData = optimizeNDCSelection(quantityData.totalQuantity, ndcData.ndcs);
      optimizedNDCResult = optimizedData;

      if (!optimizedData.success) {
        // Use enhanced error handling for optimization failures
        const error = new Error(optimizedData.error || 'Failed to optimize NDC selection');
        errorHandling.handleNDCOptimizationError(error, quantityData.totalQuantity, ndcData.ndcs);

        submitMessage = `❌ Failed to optimize NDC selection: ${optimizedData.error}`;
        submitMessageType = 'error';
        showApiResults = true;
        isSubmitting = false; // Ensure form is re-enabled
        return;
      }

      console.log('NDC optimization completed:', {
        totalPackages: optimizedData.totalPackages,
        waste: optimizedData.waste,
        optimalCandidates: optimizedData.optimalCombination.length
      });

      // Success! Show all results with enhanced notification
      submitMessage = `✓ Complete! Found optimal NDC solution: ${optimizedData.totalPackages} package${optimizedData.totalPackages !== 1 ? 's' : ''} needed`;
      submitMessageType = 'success';
      showApiResults = true;

      // Ensure form is properly re-enabled after successful calculation
      isSubmitting = false;

      // Show enhanced success notification
      errorHandling.showCalculationSuccess({
        totalPackages: optimizedData.totalPackages,
        waste: optimizedData.waste,
        totalQuantity: quantityData.totalQuantity
      });

      // Check for inactive NDCs and show warning if present
      const inactiveNDCs = optimizedData.candidates?.filter((cand: any) => cand.status === 'inactive') || [];
      if (inactiveNDCs.length > 0) {
        errorHandling.handleInactiveNDCWarning(inactiveNDCs);
      }

    } catch (error) {
      console.error('Error in complete workflow:', error);

      // Use enhanced error handling for general API errors
      errorHandling.handleAPIError(error, 'Prescription Processing');

      submitMessage = '❌ An unexpected error occurred during processing. Please try again.';
      submitMessageType = 'error';
      showApiResults = true; // Show partial results if available
    } finally {
      isSubmitting = false;
    }
  }

  function clearError(field: string) {
    if (errors[field]) {
      errors = { ...errors, [field]: '' };
    }
  }

  function resetForm() {
    drugInput = '';
    sig = '';
    manualTablets = '';
    manualTimesPerDay = '';
    daysSupply = '';
    errors = {};
    submitMessage = '';
    submitMessageType = '';
    showApiResults = false;
    normalizationResult = null;
    ndcResult = null;
    quantityResult = null;
    optimizedNDCResult = null;
  }

  // Handle keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    // Ctrl/Cmd + Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
    // Escape to clear form
    if (event.key === 'Escape') {
      resetForm();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="container">
  <div class="form-container">
    <h1>NDC Packaging & Quantity Calculator</h1>
    <p class="subtitle">Enter prescription information to calculate optimal NDC packaging and dispense quantities</p>

    <!-- Success/Error Messages -->
    {#if submitMessage}
      <div class="message {submitMessageType}" role="alert">
        {submitMessage}
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="prescription-form">
      <div class="form-group">
        <label for="drugInput">Drug Name or NDC</label>
        <input
          id="drugInput"
          type="text"
          bind:value={drugInput}
          placeholder="e.g., 'Amoxicillin' or '00093-2263-05'"
          class="form-control"
          class:has-error={errors.drugInput}
          on:input={() => clearError('drugInput')}
          disabled={isSubmitting}
        />
        {#if errors.drugInput}
          <div class="error-message">{errors.drugInput}</div>
        {/if}
        <small class="form-help">Enter either the drug name/strength or the NDC code</small>
      </div>

      <div class="form-group">
        <label for="sig">SIG (Instructions)</label>
        
        <!-- Tab Interface for AI vs Manual Mode -->
        <div class="sig-mode-tabs">
          <button
            type="button"
            class="tab-button"
            class:active={sigMode === 'ai'}
            on:click={() => sigMode = 'ai'}
            disabled={isSubmitting}
          >
            AI Mode (Recommended)
          </button>
          <button
            type="button"
            class="tab-button"
            class:active={sigMode === 'manual'}
            on:click={() => sigMode = 'manual'}
            disabled={isSubmitting}
          >
            Manual Mode
          </button>
        </div>
        
        <!-- AI Mode: Textarea for SIG text -->
        {#if sigMode === 'ai'}
          <textarea
            id="sig"
            bind:value={sig}
            placeholder="e.g., 'Take 1 tablet by mouth twice daily as needed'"
            class="form-control"
            class:has-error={errors.sig}
            on:input={() => clearError('sig')}
            disabled={isSubmitting}
            rows="3"
          ></textarea>
          {#if errors.sig}
            <div class="error-message">{errors.sig}</div>
          {/if}
          <small class="form-help">Enter prescription instructions in natural language - AI will extract dosage information</small>
        {:else}
          <!-- Manual Mode: Simple numeric inputs -->
          <div class="manual-inputs">
            <div class="manual-input-group">
              <label for="manualTablets" class="manual-label">Tablets/Units per dose</label>
              <input
                id="manualTablets"
                type="number"
                bind:value={manualTablets}
                placeholder="e.g., 1"
                class="form-control"
                class:has-error={errors.manualTablets}
                on:input={() => clearError('manualTablets')}
                disabled={isSubmitting}
                min="0.5"
                step="0.5"
              />
              {#if errors.manualTablets}
                <div class="error-message">{errors.manualTablets}</div>
              {/if}
            </div>
            
            <div class="manual-input-group">
              <label for="manualTimesPerDay" class="manual-label">Times per day</label>
              <input
                id="manualTimesPerDay"
                type="number"
                bind:value={manualTimesPerDay}
                placeholder="e.g., 2"
                class="form-control"
                class:has-error={errors.manualTimesPerDay}
                on:input={() => clearError('manualTimesPerDay')}
                disabled={isSubmitting}
                min="1"
                step="1"
              />
              {#if errors.manualTimesPerDay}
                <div class="error-message">{errors.manualTimesPerDay}</div>
              {/if}
            </div>
          </div>
          <small class="form-help">Enter dosage amounts directly</small>
        {/if}
      </div>

      <div class="form-group">
        <label for="daysSupply">Days Supply</label>
        <input
          id="daysSupply"
          type="text"
          bind:value={daysSupply}
          placeholder="e.g., 30"
          class="form-control"
          class:has-error={errors.daysSupply}
          on:input={() => clearError('daysSupply')}
          disabled={isSubmitting}
        />
        {#if errors.daysSupply}
          <div class="error-message">{errors.daysSupply}</div>
        {/if}
        <small class="form-help">Number of days the prescription should last</small>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-primary"
          disabled={isSubmitting}
        >
          {#if isSubmitting}
            Processing...
          {:else}
            Calculate
          {/if}
        </button>

        <button
          type="button"
          class="btn btn-secondary"
          on:click={resetForm}
          disabled={isSubmitting}
        >
          Clear
        </button>
      </div>
    </form>

    <!-- Complete NDC Results Display -->
    {#if showApiResults}
      <NDCResults
        ndcResult={ndcResult}
        quantityResult={optimizedNDCResult}
        isCalculating={isSubmitting}
        calculationError={submitMessageType === 'error' ? submitMessage : null}
      />
    {/if}

    <!-- Debug Panel for Development -->
    {#if logger.isDebugEnabled()}
      <DebugPanel />
    {/if}
  </div>
</div>

<!-- Toast Notifications -->
<Toast position="top-right" />

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .form-container {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  h1 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 1.8rem;
    font-weight: 600;
  }

  .subtitle {
    color: #6c757d;
    margin-bottom: 2rem;
    font-size: 1rem;
  }

  .message {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-weight: 500;
    border: 1px solid;
  }

  .message.success {
    background-color: #d4edda;
    border-color: #c3e6cb;
    color: #155724;
  }

  .message.error {
    background-color: #f8d7da;
    border-color: #f5c6cb;
    color: #721c24;
  }

  .message.info {
    background-color: #d1ecf1;
    border-color: #bee5eb;
    color: #0c5460;
  }

  .prescription-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: 600;
    color: #2c3e50;
    font-size: 0.9rem;
  }

  .form-control {
    padding: 0.75rem;
    border: 2px solid #e1e8ed;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    background-color: white;
  }

  .form-control:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }

  .form-control.has-error {
    border-color: #e74c3c;
  }

  .form-control:disabled {
    background-color: #f8f9fa;
    opacity: 0.6;
    cursor: not-allowed;
  }

  textarea.form-control {
    resize: vertical;
    min-height: 80px;
  }

  .error-message {
    color: #e74c3c;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .form-help {
    color: #6c757d;
    font-size: 0.8rem;
  }

  /* SIG Mode Tabs */
  .sig-mode-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .tab-button {
    flex: 1;
    padding: 0.5rem 1rem;
    border: 2px solid #e1e8ed;
    border-radius: 6px;
    background: white;
    color: #6c757d;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-button:hover:not(:disabled) {
    border-color: #3498db;
    color: #3498db;
  }

  .tab-button.active {
    border-color: #3498db;
    background: #3498db;
    color: white;
  }

  .tab-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Manual Mode Inputs */
  .manual-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .manual-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .manual-label {
    font-weight: 600;
    color: #2c3e50;
    font-size: 0.9rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 120px;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #3498db;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #2980b9;
  }

  .btn-secondary {
    background-color: #95a5a6;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #7f8c8d;
  }

  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    min-width: auto;
  }

  /* API Results Styles */
  .api-results {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #f8f9fa;
    border: 1px solid #e1e8ed;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .api-results h3 {
    margin: 0 0 1rem 0;
    color: #2c3e50;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .result-item .result-label {
    font-weight: 600;
    color: #6c757d;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .result-value {
    padding: 0.5rem;
    background: white;
    border: 1px solid #e1e8ed;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
  }

  .result-value.highlight {
    background: #e3f2fd;
    border-color: #2196f3;
    color: #1565c0;
    font-weight: 600;
  }

  .result-value.success {
    background: #e8f5e8;
    border-color: #28a745;
    color: #155724;
  }

  .error-details {
    margin: 1rem 0;
    padding: 1rem;
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 6px;
  }

  .error-details h4 {
    margin: 0 0 0.5rem 0;
    color: #721c24;
    font-size: 0.9rem;
  }

  .error-code {
    font-family: monospace;
    background: #f8d7da;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .error-message {
    color: #721c24;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .error-details-text {
    color: #856404;
    font-size: 0.9rem;
    font-style: italic;
  }

  .result-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e1e8ed;
  }

  @media (max-width: 640px) {
    .container {
      padding: 1rem;
    }

    .form-container {
      padding: 1.5rem;
    }

    .form-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
    
    .manual-inputs {
      grid-template-columns: 1fr;
    }
  }
</style>
