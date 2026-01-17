import {processSupportTicketSafely} from '@mullion/template-helpdesk';
import {estimateTokens, calculateCost} from '@mullion/ai-sdk';

/**
 * Analyze support ticket endpoint
 *
 * Demonstrates Mullion's scope isolation by processing a support ticket
 * and generating both admin notes and a public response with enforced boundaries.
 */
export default defineEventHandler(async (event) => {
  const {llmModelName} = useRuntimeConfig(event);

  try {
    // Authentication and rate limiting
    const user = await requireAuth(event);
    await enforceRateLimit(event, user);

    const body = await readBody(event);
    const {ticketText} = body;

    if (!ticketText || typeof ticketText !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Missing or invalid ticketText field',
      });
    }

    // Execute the safe helpdesk flow using the template
    // This uses Mullion to enforce scope boundaries between admin and public contexts
    let result;
    try {
      // Use explicit provider config for more reliable structured output
      const providerConfig = {
        provider: 'openai' as const,
        model: llmModelName, // Use gpt-4o instead of gpt-4o-mini for better structured output
      };
      result = await processSupportTicketSafely(providerConfig, ticketText);
    } catch (llmError: any) {
      // If LLM fails to generate proper schema, provide helpful error
      if (llmError.message?.includes('response did not match schema')) {
        throw createError({
          statusCode: 500,
          statusMessage: 'LLM Response Error',
          message:
            'The AI model failed to generate a properly structured response. This can happen with complex tickets. Please try simplifying your request or try again.',
        });
      }
      throw llmError;
    }

    // Estimate cost for multi-step process (admin analysis + public response)
    // Both API calls use the same input (ticket text) but different outputs
    const adminOutput = `${result.adminAnalysis.value.summary}\n${result.adminAnalysis.value.internalNotes}\n${result.adminAnalysis.value.recommendedActions.join('\n')}`;
    const publicOutput = result.response.value.message;

    // Calculate tokens for both calls using gpt-4o (matching the model we use)
    const inputTokensPerCall = estimateTokens(ticketText, llmModelName).count;
    const adminOutputTokens = estimateTokens(adminOutput, llmModelName).count;
    const publicOutputTokens = estimateTokens(publicOutput, llmModelName).count;

    console.log('💰 Cost calculation debug:', {
      inputTokensPerCall,
      adminOutputTokens,
      publicOutputTokens,
    });

    // Total cost for both API calls
    const totalInputTokens = inputTokensPerCall * 2; // Same input for both calls
    const totalOutputTokens = adminOutputTokens + publicOutputTokens;

    const costBreakdown = calculateCost(
      {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
      null, // No cache stats
      llmModelName,
    );

    console.log('💰 Cost breakdown:', {
      totalInputTokens,
      totalOutputTokens,
      totalCost: costBreakdown.totalCost,
    });

    // Return the result with both admin and public views
    return {
      ticketSummary: result.adminAnalysis.value.summary,
      internalNotes: result.adminAnalysis.value.internalNotes,
      recommendedActions: result.adminAnalysis.value.recommendedActions,
      publicResponse: result.response.value.message,
      adminConfidence: result.adminAnalysis.confidence,
      publicConfidence: result.response.confidence,
      cost: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalCost: costBreakdown.totalCost,
      },
    };
  } catch (error: unknown) {
    console.error('Ticket analysis error:', error);

    // Handle rate limit errors
    if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      error.statusCode === 429
    ) {
      throw error;
    }

    // Handle auth errors
    if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      error.statusCode === 401
    ) {
      throw error;
    }

    // Generic error
    const errorMessage =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : 'Failed to analyze ticket';

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: errorMessage,
    });
  }
});
