import {
  executeRAGPipeline,
  type RAGPipelineResult,
} from '@mullion/template-rag-sensitive-data';

/**
 * RAG query endpoint
 *
 * Demonstrates Mullion's fork/merge patterns and access control
 * by querying documents with role-based filtering.
 */
export default defineEventHandler(async (event) => {
  try {
    // Authentication and rate limiting
    const user = await requireAuth(event);
    await enforceRateLimit(event, user);

    const body = await readBody(event);
    const { query, role } = body;

    if (!query || typeof query !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Missing or invalid query field',
      });
    }

    if (!role || !['public', 'internal', 'confidential'].includes(role)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid role. Must be public, internal, or confidential',
      });
    }

    // Execute the RAG pipeline using the template
    // This uses Mullion's fork/merge patterns with access control
    const result: RAGPipelineResult = await executeRAGPipeline(query, {
      accessLevel: role,
      providerConfig: {
        provider: 'mock', // Will use real provider when API keys are available
      },
    });

    // Return the result with answer, sources, and cost
    return {
      answer: result.answer.response,
      confidence: result.answer.confidence,
      sources: result.retrievedDocuments.map((doc) => ({
        title: doc.title,
        excerpt: doc.content.substring(0, 150) + '...',
      })),
      cost: {
        inputTokens: result.totalTokens?.input ?? 0,
        outputTokens: result.totalTokens?.output ?? 0,
        totalCost: result.estimatedCost ?? 0,
        cacheHit: (result.cacheStats?.hits ?? 0) > 0,
      },
    };
  } catch (error: unknown) {
    console.error('RAG query error:', error);

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
        : 'Failed to execute query';

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: errorMessage,
    });
  }
});
