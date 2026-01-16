import {processSupportTicketSafely} from '@mullion/template-helpdesk';

/**
 * Analyze support ticket endpoint
 *
 * Demonstrates Mullion's scope isolation by processing a support ticket
 * and generating both admin notes and a public response with enforced boundaries.
 */
export default defineEventHandler(async (event) => {
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
    const result = await processSupportTicketSafely(undefined, ticketText);

    // Return the result with both admin and public views
    return {
      ticketSummary: result.adminAnalysis.value.summary,
      internalNotes: result.adminAnalysis.value.internalNotes,
      recommendedActions: result.adminAnalysis.value.recommendedActions,
      publicResponse: result.response.value.message,
      adminConfidence: result.adminAnalysis.confidence,
      publicConfidence: result.response.confidence,
      cost: {
        inputTokens: 0, // Template doesn't expose token counts yet
        outputTokens: 0,
        totalCost: 0,
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
