/**
 * Ticket Analysis API Endpoint
 *
 * POST /api/analyze
 *
 * Processes a support ticket through the safe helpdesk flow.
 */

import {defineEventHandler, readBody, createError} from 'h3';

interface AnalyzeRequest {
  ticket: string;
  includeAdminData?: boolean;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AnalyzeRequest>(event);

  if (!body.ticket || typeof body.ticket !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid "ticket" field',
    });
  }

  try {
    const result = await processSupportTicket(event, body.ticket);

    // Only return admin data if explicitly requested (would require auth in production)
    if (body.includeAdminData) {
      return {
        success: true,
        data: {
          adminAnalysis: result.adminAnalysis,
          customerResponse: result.customerResponse,
        },
      };
    }

    // Default: only return customer-facing data
    return {
      success: true,
      data: {
        ticketId: result.adminAnalysis.ticketId,
        summary: result.adminAnalysis.summary,
        category: result.adminAnalysis.category,
        priority: result.adminAnalysis.priority,
        customerResponse: result.customerResponse,
      },
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : 'Ticket processing failed',
    });
  }
});
