/**
 * RAG Pipeline Orchestration
 *
 * Complete RAG pipeline demonstrating Mullion's capabilities:
 * - Document classification and access control
 * - Query analysis in scoped context
 * - Response generation with confidence tracking
 */

import {analyzeQuery, retrieveDocuments} from './retriever';
import {generateResponseWithSources} from './generator';
import type {UserQuery, RAGResponse} from '@/schemas';
import type {ProviderConfig} from '@/mullion/provider';

export interface RAGPipelineResult {
  query: UserQuery;
  response: RAGResponse;
  metrics: {
    documentsRetrieved: number;
    documentsUsed: number;
    highestAccessLevel: string;
    overallConfidence: number;
    executionTimeMs: number;
  };
}

/**
 * Execute complete RAG pipeline
 * @param query - User query
 * @param options - Pipeline options
 */
export async function executeRAGPipeline(
  query: UserQuery,
  options: {
    topK?: number;
    providerConfig?: ProviderConfig;
  } = {},
): Promise<RAGPipelineResult> {
  const {topK = 3, providerConfig} = options;
  const startTime = Date.now();

  // Step 1: Analyze Query
  const analysis = await analyzeQuery(query, providerConfig);

  // Step 2: Access Check
  const accessHierarchy = {
    public: 0,
    internal: 1,
    confidential: 2,
  };

  const userLevel = accessHierarchy[query.userAccessLevel];
  const requiredLevel = accessHierarchy[analysis.value.requiredAccessLevel];

  if (userLevel < requiredLevel) {
    throw new Error(
      `Insufficient access: Query requires ${analysis.value.requiredAccessLevel} level, user has ${query.userAccessLevel}`,
    );
  }

  // Step 3: Retrieve Documents
  const retrievedChunks = await retrieveDocuments(query, topK);

  if (retrievedChunks.length === 0) {
    return {
      query,
      response: {
        answer:
          "I couldn't find any relevant documents to answer your question.",
        sources: [],
        accessLevelUsed: query.userAccessLevel,
        confidence: 0,
        reasoning: 'No relevant documents found',
      },
      metrics: {
        documentsRetrieved: 0,
        documentsUsed: 0,
        highestAccessLevel: query.userAccessLevel,
        overallConfidence: 0,
        executionTimeMs: Date.now() - startTime,
      },
    };
  }

  // Step 4: Generate Response
  const result = await generateResponseWithSources(
    query,
    retrievedChunks,
    providerConfig,
  );

  return {
    query,
    response: result.response,
    metrics: {
      documentsRetrieved: retrievedChunks.length,
      documentsUsed: result.response.sources.length,
      highestAccessLevel: result.highestAccessLevel,
      overallConfidence: result.totalConfidence,
      executionTimeMs: Date.now() - startTime,
    },
  };
}
