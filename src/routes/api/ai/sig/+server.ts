// AI-powered SIG parsing endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/services/logger';
import { env } from '$env/dynamic/private';

// Interface for the parsed SIG response
interface ParsedSIGResponse {
  success: boolean;
  amount?: number;
  unit?: string;
  frequency?: number;
  timing?: string;
  route?: string;
  error?: string;
  rawResponse?: string;
}

/**
 * POST /api/ai/sig
 * Uses OpenAI to parse SIG (prescription instructions) text into structured data
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { sig } = await request.json();

    if (!sig || typeof sig !== 'string' || sig.trim().length === 0) {
      return json({
        success: false,
        error: 'SIG text is required'
      }, { status: 400 });
    }

    // Get OpenAI API key from environment using SvelteKit's env
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OPENAI_API_KEY not found in environment variables', { 
        availableEnvKeys: Object.keys(env).filter(k => !k.includes('SECRET'))
      });
      return json({
        success: false,
        error: 'AI service not configured. Please set OPENAI_API_KEY in .env file and restart the server.'
      }, { status: 500 });
    }

    // Call OpenAI API to parse the SIG
    logger.info('Calling OpenAI API to parse SIG', { sig });

    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a medical prescription parser. Extract structured information from SIG (prescription instructions) text.
Return ONLY a JSON object with these fields:
- amount: number (dose per administration)
- unit: string (e.g., "tablet", "capsule", "ml", "mg")
- frequency: number (times per day)
- timing: string (optional, e.g., "with food", "morning", "as needed")
- route: string (optional, e.g., "PO", "IV", "TOPICAL")

Examples:
Input: "Take 1 tablet by mouth twice daily"
Output: {"amount": 1, "unit": "tablet", "frequency": 2, "route": "PO"}

Input: "Take 2 capsules PO 3 times daily with food"
Output: {"amount": 2, "unit": "capsule", "frequency": 3, "timing": "with food", "route": "PO"}

Input: "Apply 1 patch topically once daily"
Output: {"amount": 1, "unit": "patch", "frequency": 1, "route": "TOPICAL"}`
        },
        {
          role: 'user',
          content: sig
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    };

    logger.info('OpenAI request body', { model: requestBody.model, messageCount: requestBody.messages.length });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logger.error('OpenAI API error', { status: openaiResponse.status, error: errorText });
      return json({
        success: false,
        error: `AI service error: ${openaiResponse.statusText || openaiResponse.status}`
      }, { status: openaiResponse.status });
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      logger.error('No response from OpenAI', { data: openaiData });
      return json({
        success: false,
        error: 'No response from AI service'
      }, { status: 500 });
    }

    logger.info('OpenAI response received', { response: aiResponse });

    // Parse the AI response (it should be JSON)
    try {
      const parsed = JSON.parse(aiResponse);
      
      // Validate required fields
      if (!parsed.amount || !parsed.unit || !parsed.frequency) {
        logger.warn('AI response missing required fields', { parsed });
        return json({
          success: false,
          error: 'Could not extract required dosage information from SIG',
          rawResponse: aiResponse
        }, { status: 400 });
      }

      // Return the parsed SIG data
      return json({
        success: true,
        amount: Number(parsed.amount),
        unit: String(parsed.unit).toLowerCase().replace(/s$/, ''), // normalize to singular
        frequency: Number(parsed.frequency),
        timing: parsed.timing ? String(parsed.timing) : undefined,
        route: parsed.route ? String(parsed.route).toUpperCase() : undefined,
        rawResponse: aiResponse
      });

    } catch (parseError) {
      logger.error('Failed to parse AI response as JSON', { response: aiResponse, error: parseError });
      return json({
        success: false,
        error: 'AI returned invalid response format',
        rawResponse: aiResponse
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('Error in AI SIG parsing endpoint', { error });
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
};

