<script lang="ts">
  import type { OptimizedNDCResult, NDCCandidate } from '$lib/types/quantity';
  import type { NDCRetrievalResult } from '$lib/types/ndc';
  import { errorHandling } from '$lib/services/errorHandling';

  export let ndcResult: NDCRetrievalResult | null = null;
  export let quantityResult: OptimizedNDCResult | null = null;
  export let isCalculating = false;
  export let calculationError: string | null = null;

  $: hasResults = ndcResult?.success && quantityResult?.success;
  $: optimalNDCs = quantityResult?.optimalCombination || [];
  $: allCandidates = quantityResult?.candidates || [];

  function formatNDC(ndc: string): string {
    // Format NDC as 5-4-2 format if possible
    if (ndc.length === 11) {
      return `${ndc.slice(0,5)}-${ndc.slice(5,9)}-${ndc.slice(9,11)}`;
    }
    return ndc;
  }

  function getStatusColor(status: 'active' | 'inactive'): string {
    return status === 'active' ? '#28a745' : '#dc3545';
  }

  function getStatusText(status: 'active' | 'inactive'): string {
    return status === 'active' ? 'Active' : 'Inactive';
  }

  function calculateWastePercentage(candidate: NDCCandidate): number {
    if (candidate.packagesRequired === 0) return 0;
    const totalProvided = candidate.packagesRequired * candidate.packageSize;
    const waste = totalProvided - candidate.quantityNeeded;
    return Math.round((waste / candidate.quantityNeeded) * 100);
  }

  async function copyToClipboard(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Create a temporary success message
      const toast = document.createElement('div');
      toast.className = 'toast success';
      toast.textContent = successMessage;
      document.body.appendChild(toast);

      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function copyJSON() {
    const data = {
      ndcResult,
      quantityResult,
      timestamp: new Date().toISOString()
    };
    copyToClipboard(JSON.stringify(data, null, 2), 'JSON copied to clipboard!');
  }

  function copyOptimalNDCs() {
    const optimal = optimalNDCs.map(cand => ({
      ndc: cand.ndc,
      packages: cand.packagesRequired,
      description: cand.packageDescription
    }));
    copyToClipboard(JSON.stringify(optimal, null, 2), 'Optimal NDCs copied to clipboard!');
  }
</script>

<div class="ndc-display-container" role="region" aria-label="NDC Results">
  {#if isCalculating}
    <div class="loading-state">
      <div class="spinner"></div>
      <h3>🔄 Calculating Optimal NDCs...</h3>
      <p>Analyzing package options and determining the best combination for your prescription.</p>
    </div>
  {:else if calculationError}
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Calculation Error</h3>
      <p>{calculationError}</p>
    </div>
  {:else if hasResults}
    <!-- Summary Section -->
    <div class="summary-section">
      <h3>📊 Prescription Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total Quantity Needed:</div>
          <div class="summary-value">{quantityResult.totalQuantity} units</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Optimal Packages:</div>
          <div class="summary-value">{quantityResult.totalPackages}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Estimated Waste:</div>
          <div class="summary-value">{quantityResult.waste} units</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Available NDC Options:</div>
          <div class="summary-value">{allCandidates.length}</div>
        </div>
      </div>
    </div>

    <!-- Optimal NDC Recommendation -->
    {#if optimalNDCs.length > 0}
      <div class="optimal-section">
        <h3>⭐ Recommended NDC(s)</h3>
        <div class="optimal-cards">
          {#each optimalNDCs as candidate, index}
            <div class="optimal-card" class:recommended={index === 0}>
              <div class="card-header">
                <div class="ndc-info">
                  <span class="ndc-code">{formatNDC(candidate.ndc)}</span>
                  <span class="status-badge" style="color: {getStatusColor(candidate.status)}">
                    {getStatusText(candidate.status)}
                  </span>
                </div>
                {#if index === 0}
                  <div class="recommendation-badge">Best Option</div>
                {/if}
              </div>

              <div class="card-content">
                <div class="package-info">
                  <div class="package-description">{candidate.packageDescription}</div>
                  <div class="package-details">
                    <span class="package-size">{candidate.packageSize} units/package</span>
                    <span class="packages-required">{candidate.packagesRequired} package{candidate.packagesRequired !== 1 ? 's' : ''} needed</span>
                  </div>
                </div>

                <div class="efficiency-info">
                  <div class="efficiency-score">
                    <span class="efficiency-label">Efficiency:</span>
                    <span class="efficiency-value">
                      {100 - calculateWastePercentage(candidate)}%
                    </span>
                  </div>
                  <div class="waste-info">
                    <span class="waste-amount">{Math.round(candidate.efficiency * candidate.quantityNeeded)} units waste</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- All Available NDC Options Table -->
    {#if allCandidates.length > 1}
      <div class="all-options-section">
        <h3>📋 All Available NDC Options</h3>
        <div class="table-container">
          <table class="ndc-options-table">
            <thead>
              <tr>
                <th>NDC Code</th>
                <th>Package Description</th>
                <th>Package Size</th>
                <th>Status</th>
                <th>Packages Needed</th>
                <th>Efficiency</th>
                <th>Waste</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each allCandidates as candidate}
                <tr
                  class="candidate-row"
                  class:optimal={optimalNDCs.some(opt => opt.ndc === candidate.ndc)}
                  class:inactive={candidate.status === 'inactive'}
                >
                  <td class="ndc-cell">
                    <span class="ndc-code">{formatNDC(candidate.ndc)}</span>
                    {#if optimalNDCs.some(opt => opt.ndc === candidate.ndc)}
                      <span class="recommended-indicator">⭐</span>
                    {/if}
                  </td>
                  <td class="description-cell">{candidate.packageDescription}</td>
                  <td class="size-cell">{candidate.packageSize}</td>
                  <td class="status-cell">
                    <span
                      class="status-badge"
                      style="color: {getStatusColor(candidate.status)}"
                    >
                      {getStatusText(candidate.status)}
                    </span>
                  </td>
                  <td class="packages-cell">{candidate.packagesRequired}</td>
                  <td class="efficiency-cell">
                    <div class="efficiency-bar">
                      <div
                        class="efficiency-fill"
                        style="width: {100 - calculateWastePercentage(candidate)}%"
                      ></div>
                      <span class="efficiency-text">
                        {100 - calculateWastePercentage(candidate)}%
                      </span>
                    </div>
                  </td>
                  <td class="waste-cell">
                    {Math.round(candidate.efficiency * candidate.quantityNeeded)} units
                  </td>
                  <td class="actions-cell">
                    <button
                      class="btn-copy-small"
                      on:click={() => copyToClipboard(
                        formatNDC(candidate.ndc),
                        'NDC copied to clipboard!'
                      )}
                      title="Copy NDC"
                    >
                      📋
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Actions Section -->
    <div class="actions-section">
      <h3>🔧 Actions</h3>
      <div class="action-buttons">
        <button class="btn btn-primary" on:click={copyOptimalNDCs}>
          📋 Copy Optimal NDCs
        </button>
        <button class="btn btn-secondary" on:click={copyJSON}>
          📄 Copy Full JSON Results
        </button>
      </div>
    </div>

    <!-- Enhanced Warning for Inactive NDCs -->
    {#if allCandidates.some(c => c.status === 'inactive')}
      <div class="warning-section">
        <div class="warning-header">
          <span class="warning-icon">⚠️</span>
          <h4>Inactive NDCs Detected</h4>
        </div>
        <p>Some NDC options are marked as inactive by the FDA. These may have limited availability or discontinued status.</p>

        <div class="inactive-ndc-list">
          {#each allCandidates.filter(c => c.status === 'inactive') as inactiveNDC}
            <div class="inactive-ndc-item">
              <div class="inactive-ndc-info">
                <span class="inactive-ndc-code">{formatNDC(inactiveNDC.ndc)}</span>
                <span class="inactive-ndc-description">{inactiveNDC.packageDescription}</span>
              </div>
              <div class="inactive-ndc-actions">
                <button
                  class="btn btn-small btn-secondary"
                  on:click={() => errorHandling.showWarning(
                    'Inactive NDC Warning',
                    `NDC ${formatNDC(inactiveNDC.ndc)} is marked as inactive. Please verify availability with your pharmacy before dispensing.`,
                    { persistent: true }
                  )}
                >
                  Show Details
                </button>
              </div>
            </div>
          {/each}
        </div>

        <div class="warning-actions">
          <button
            class="btn btn-small btn-secondary"
            on:click={() => {
              errorHandling.showInfo(
                'Pharmacy Verification Required',
                'Always verify inactive NDC availability with your pharmacy system before dispensing. Inactive status may indicate discontinued products, packaging changes, or limited distribution.'
              );
            }}
          >
            Learn More
          </button>
          <button
            class="btn btn-small btn-primary"
            on:click={() => {
              errorHandling.showWarning(
                'Proceed with Caution',
                'I understand that I need to verify NDC availability with the pharmacy before dispensing.'
              );
            }}
          >
            Acknowledge Warning
          </button>
        </div>
      </div>
    {/if}
  {:else if ndcResult || quantityResult}
    <!-- No Results State -->
    <div class="no-results-state">
      <div class="no-results-icon">🔍</div>
      <h3>No NDC Results Available</h3>
      <p>Unable to retrieve NDC information or calculate quantities. Please check your input and try again.</p>
    </div>
  {/if}
</div>

<style>
  .ndc-display-container {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Loading State */
  .loading-state {
    text-align: center;
    padding: 3rem 2rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 2px solid #e1e8ed;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e1e8ed;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error State */
  .error-state {
    text-align: center;
    padding: 3rem 2rem;
    background: #fff5f5;
    border-radius: 8px;
    border: 2px solid #fed7d7;
    color: #721c24;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  /* Section Styling */
  .summary-section,
  .optimal-section,
  .all-options-section,
  .actions-section {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e1e8ed;
    overflow: hidden;
  }

  .summary-section h3,
  .optimal-section h3,
  .all-options-section h3,
  .actions-section h3 {
    margin: 0;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e1e8ed;
    font-size: 1.1rem;
    font-weight: 600;
    color: #2c3e50;
  }

  /* Summary Grid */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    padding: 1.5rem;
  }

  .summary-item {
    text-align: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e1e8ed;
  }

  .summary-label {
    font-size: 0.875rem;
    color: #6c757d;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .summary-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #2c3e50;
  }

  /* Optimal Cards */
  .optimal-cards {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .optimal-card {
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .optimal-card.recommended {
    border-color: #28a745;
    box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
  }

  .optimal-card:hover {
    border-color: #3498db;
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e1e8ed;
  }

  .ndc-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .ndc-code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-weight: 600;
    font-size: 1rem;
    color: #2c3e50;
  }

  .status-badge {
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .recommendation-badge {
    background: #28a745;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .card-content {
    padding: 1.5rem;
  }

  .package-info {
    margin-bottom: 1rem;
  }

  .package-description {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }

  .package-details {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: #6c757d;
  }

  .efficiency-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .efficiency-score {
    text-align: center;
  }

  .efficiency-label {
    display: block;
    font-size: 0.75rem;
    color: #6c757d;
    margin-bottom: 0.25rem;
  }

  .efficiency-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #28a745;
  }

  .waste-info {
    text-align: right;
  }

  .waste-amount {
    font-size: 0.875rem;
    color: #dc3545;
    font-weight: 500;
  }

  /* Table Styles */
  .table-container {
    overflow-x: auto;
  }

  .ndc-options-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .ndc-options-table th {
    background: #f8f9fa;
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    color: #2c3e50;
    border-bottom: 2px solid #e1e8ed;
    white-space: nowrap;
  }

  .ndc-options-table td {
    padding: 0.75rem;
    border-bottom: 1px solid #e1e8ed;
    vertical-align: middle;
  }

  .candidate-row.optimal {
    background: rgba(40, 167, 69, 0.05);
  }

  .candidate-row.optimal td {
    border-bottom-color: #28a745;
  }

  .candidate-row.inactive {
    opacity: 0.7;
    background: rgba(220, 53, 69, 0.05);
  }

  .ndc-cell {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-weight: 600;
  }

  .recommended-indicator {
    margin-left: 0.5rem;
    color: #ffc107;
  }

  .efficiency-cell {
    width: 120px;
  }

  .efficiency-bar {
    position: relative;
    width: 100%;
    height: 20px;
    background: #e1e8ed;
    border-radius: 10px;
    overflow: hidden;
  }

  .efficiency-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #20c997);
    transition: width 0.3s ease;
  }

  .efficiency-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
  }

  .actions-cell {
    text-align: center;
  }

  .btn-copy-small {
    background: none;
    border: 1px solid #e1e8ed;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .btn-copy-small:hover {
    background: #f8f9fa;
    border-color: #3498db;
  }

  /* Actions Section */
  .action-buttons {
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
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

  .btn-primary {
    background-color: #3498db;
    color: white;
  }

  .btn-primary:hover {
    background-color: #2980b9;
  }

  .btn-secondary {
    background-color: #95a5a6;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #7f8c8d;
  }

  /* Enhanced Warning Section */
  .warning-section {
    background: linear-gradient(135deg, #fff3cd, #fef9e7);
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    padding: 1.5rem;
    color: #856404;
    box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
  }

  .warning-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .warning-header h4 {
    margin: 0;
    color: #856404;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .warning-icon {
    font-size: 1.5rem;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Inactive NDC List */
  .inactive-ndc-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .inactive-ndc-item {
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 193, 7, 0.3);
    border-radius: 6px;
    padding: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s ease;
  }

  .inactive-ndc-item:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 193, 7, 0.5);
    transform: translateY(-1px);
  }

  .inactive-ndc-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .inactive-ndc-code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-weight: 600;
    font-size: 0.9rem;
    color: #856404;
  }

  .inactive-ndc-description {
    font-size: 0.85rem;
    color: #666;
  }

  .inactive-ndc-actions {
    display: flex;
    gap: 0.5rem;
  }

  .warning-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 193, 7, 0.3);
  }

  /* No Results State */
  .no-results-state {
    text-align: center;
    padding: 3rem 2rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 2px solid #e1e8ed;
    color: #6c757d;
  }

  .no-results-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  /* Toast Notifications */
  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: 6px;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  }

  .toast.success {
    background: #28a745;
    color: white;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .package-details {
      flex-direction: column;
      gap: 0.25rem;
    }

    .efficiency-info {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .action-buttons {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }

    .table-container {
      font-size: 0.75rem;
    }

    .ndc-options-table th,
    .ndc-options-table td {
      padding: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .card-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }
  }
</style>