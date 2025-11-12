import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeDrugToRxCUI } from '$lib/services/rxnorm';
import { getNDCsByRxCUI } from '$lib/services/ndc';
import { calculateDispenseQuantity, optimizeNDCSelection } from '$lib/services/quantity';

export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();

  try {
    const { drugInput, sig, daysSupply } = await request.json();

    // Validate input
    if (!drugInput || !sig || !daysSupply) {
      return json(
        { error: 'Missing required fields', processingTime: Date.now() - startTime },
        { status: 400 }
      );
    }

    // Step 1: Normalize drug to RxCUI
    const normResult = await normalizeDrugToRxCUI(drugInput.trim());
    if (!normResult.success || !normResult.rxcui) {
      return json(
        { error: 'Failed to normalize drug', processingTime: Date.now() - startTime },
        { status: 404 }
      );
    }

    // Step 2: Get NDCs using RxCUI
    const ndcData = await getNDCsByRxCUI(normResult.rxcui);
    if (!ndcData.success || ndcData.ndcs.length === 0) {
      return json(
        { error: 'No NDCs found', processingTime: Date.now() - startTime },
        { status: 404 }
      );
    }

    // Step 3: Calculate dispense quantity
    const quantityData = calculateDispenseQuantity(sig.trim(), Number(daysSupply));
    if (!quantityData.success) {
      return json(
        { error: 'Failed to calculate quantity', processingTime: Date.now() - startTime },
        { status: 400 }
      );
    }

    // Step 4: Optimize NDC selection
    const optimizedData = optimizeNDCSelection(quantityData.totalQuantity, ndcData.ndcs);
    if (!optimizedData.success) {
      return json(
        { error: 'Failed to optimize NDC selection', processingTime: Date.now() - startTime },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;

    // Return success response with processing time
    return json({
      success: true,
      data: {
        rxcui: normResult.rxcui,
        drugName: normResult.drugName,
        ndcCount: ndcData.ndcs.length,
        totalQuantity: quantityData.totalQuantity,
        totalPackages: optimizedData.totalPackages,
        waste: optimizedData.waste
      },
      processingTime,
      withinSLA: processingTime < 2000 // Return whether response is within 2-second SLA
    });

  } catch (error) {
    return json(
      {
        error: 'Internal server error',
        processingTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  return json({
    message: 'Performance test endpoint',
    usage: 'POST /api/performance-test with { drugInput, sig, daysSupply }',
    timestamp: new Date().toISOString()
  });
};