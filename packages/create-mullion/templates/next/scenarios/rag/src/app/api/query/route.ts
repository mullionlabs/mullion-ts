/**
 * RAG Query API Endpoint
 *
 * POST /api/query
 *
 * Executes the RAG pipeline with the provided query and user access level.
 */

import {executeRAGPipeline} from '@/mullion/pipeline';
import type {AccessLevel} from '@/schemas';

interface QueryRequest {
  query: string;
  accessLevel?: AccessLevel;
  topK?: number;
}

export async function POST(request: Request) {
  let body: QueryRequest;

  try {
    body = (await request.json()) as QueryRequest;
  } catch {
    return Response.json({message: 'Invalid JSON body'}, {status: 400});
  }

  if (!body?.query || typeof body.query !== 'string') {
    return Response.json(
      {message: 'Missing or invalid "query" field'},
      {status: 400},
    );
  }

  const userQuery = {
    query: body.query,
    userAccessLevel: body.accessLevel || ('public' as AccessLevel),
  };

  try {
    const result = await executeRAGPipeline(userQuery, {
      topK: body.topK || 3,
    });

    return Response.json({
      success: true,
      data: {
        answer: result.response.answer,
        sources: result.response.sources,
        confidence: result.response.confidence,
        accessLevel: result.response.accessLevelUsed,
        metrics: result.metrics,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Insufficient access')
    ) {
      return Response.json({message: error.message}, {status: 403});
    }

    return Response.json(
      {
        message:
          error instanceof Error ? error.message : 'Pipeline execution failed',
      },
      {status: 500},
    );
  }
}
