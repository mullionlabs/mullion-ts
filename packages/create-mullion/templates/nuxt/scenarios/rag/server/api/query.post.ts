/**
 * RAG Query API Endpoint
 *
 * POST /api/query
 *
 * Executes the RAG pipeline with the provided query and user access level.
 */

import {defineEventHandler, readBody, createError} from 'h3';
import type {AccessLevel} from '~~/schemas';

interface QueryRequest {
  query: string;
  accessLevel?: AccessLevel;
  topK?: number;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<QueryRequest>(event);

  if (!body.query || typeof body.query !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid "query" field',
    });
  }

  const userQuery = {
    query: body.query,
    userAccessLevel: body.accessLevel || ('public' as AccessLevel),
  };

  try {
    const result = await executeRAGPipeline(event, userQuery, {
      topK: body.topK || 3,
    });

    return {
      success: true,
      data: {
        answer: result.response.answer,
        sources: result.response.sources,
        confidence: result.response.confidence,
        accessLevel: result.response.accessLevelUsed,
        metrics: result.metrics,
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Insufficient access')
    ) {
      throw createError({
        statusCode: 403,
        message: error.message,
      });
    }

    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : 'Pipeline execution failed',
    });
  }
});
