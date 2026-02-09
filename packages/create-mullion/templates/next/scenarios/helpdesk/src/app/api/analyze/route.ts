/**
 * Helpdesk Analysis API Endpoint
 *
 * POST /api/analyze
 *
 * Processes a support ticket and returns sanitized customer response.
 */

import {processSupportTicket} from '@/mullion/processor';

interface AnalyzeRequest {
  ticket: string;
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;

  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({message: 'Invalid JSON body'}, {status: 400});
  }

  if (!body?.ticket || typeof body.ticket !== 'string') {
    return Response.json(
      {message: 'Missing or invalid "ticket" field'},
      {status: 400},
    );
  }

  try {
    const result = await processSupportTicket(body.ticket);

    return Response.json({
      success: true,
      data: {
        ticketId: result.adminAnalysis.ticketId,
        summary: result.adminAnalysis.summary,
        category: result.adminAnalysis.category,
        priority: result.adminAnalysis.priority,
        customerResponse: result.customerResponse,
      },
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : 'Ticket processing failed',
      },
      {status: 500},
    );
  }
}
