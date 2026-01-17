import {
  executeRAGPipeline,
  type RAGPipelineResult,
} from '@mullion/template-rag-sensitive-data';
import {estimateTokens, calculateCost} from '@mullion/ai-sdk';

/**
 * RAG query endpoint
 *
 * Demonstrates Mullion's fork/merge patterns and access control
 * by querying documents with role-based filtering.
 */
export default defineEventHandler(async (event) => {
  const {llmModelName} = useRuntimeConfig(event);

  try {
    // Authentication and rate limiting
    const user = await requireAuth(event);
    await enforceRateLimit(event, user);

    const body = await readBody(event);
    const {query, role} = body;

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
    // Provider is auto-detected from environment variables (OPENAI_API_KEY or ANTHROPIC_API_KEY)
    const result: RAGPipelineResult = await executeRAGPipeline(
      {
        query,
        userAccessLevel: role,
        context: 'Demo app query',
      },
      {
        verbose: false,
        // providerConfig: undefined - auto-detects from env vars
      },
    );

    // Estimate token counts and calculate cost using Mullion's cost calculator
    const inputTokens = estimateTokens(query, llmModelName).count;
    const outputTokens = estimateTokens(
      result.response.answer,
      llmModelName,
    ).count;

    const costBreakdown = calculateCost(
      {
        inputTokens,
        outputTokens,
      },
      null, // No cache stats
      llmModelName,
    );

    // Return the result with answer, sources, and metrics
    return {
      answer: result.response.answer,
      confidence: result.response.confidence,
      sources: result.response.sources.map((source) => ({
        title: source.title,
        excerpt: `${source.accessLevel.toUpperCase()} document`,
      })),
      cost: {
        inputTokens,
        outputTokens,
        totalCost: costBreakdown.totalCost,
        cacheHit: false,
      },
      metrics: {
        documentsRetrieved: result.metrics.documentsRetrieved,
        documentsUsed: result.metrics.documentsUsed,
        executionTimeMs: result.metrics.executionTimeMs,
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
