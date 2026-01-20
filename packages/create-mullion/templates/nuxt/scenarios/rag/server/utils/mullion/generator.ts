/**
 * Response Generator
 *
 * Generates RAG responses with source attribution and confidence tracking.
 */

import type {H3Event} from 'h3';
import {createMullionClient} from '@mullion/ai-sdk';
import {RAGResponse} from '~~/schemas';
import type {UserQuery, RetrievedChunk, AccessLevel} from '~~/schemas';
import type {ProviderConfig} from './provider';

/**
 * Generate response from retrieved documents
 * @param event - H3 event from the API route
 * @param query - User query
 * @param retrievedChunks - Retrieved document chunks
 * @param providerConfig - Optional provider configuration
 */
export async function generateResponse(
  event: H3Event,
  query: UserQuery,
  retrievedChunks: RetrievedChunk[],
  providerConfig?: ProviderConfig,
): Promise<RAGResponse> {
  const model = getLanguageModel(event, providerConfig);

  if (!model) {
    return getMockResponse(query, retrievedChunks);
  }

  const client = createMullionClient(
    model,
    getMullionClientOptions(event, providerConfig),
  );

  const result = await client.scope('generator', async (ctx) => {
    const context = retrievedChunks
      .map(
        (chunk, i) => `
[Source ${i + 1}: ${chunk.documentTitle} - ${chunk.accessLevel.toUpperCase()}]
${chunk.excerpt}
`,
      )
      .join('\n');

    const userPrompt = `Context from knowledge base:
${context}

User Question: ${query.query}

Please provide a comprehensive answer based on the context above. Cite your sources.`;

    const response = await ctx.infer(RAGResponse, userPrompt);
    return ctx.use(response);
  });

  return result;
}

/**
 * Generate response with explicit source tracking
 * @param event - H3 event from the API route
 * @param query - User query
 * @param retrievedChunks - Retrieved document chunks
 * @param providerConfig - Optional provider configuration
 */
export async function generateResponseWithSources(
  event: H3Event,
  query: UserQuery,
  retrievedChunks: RetrievedChunk[],
  providerConfig?: ProviderConfig,
): Promise<{
  response: RAGResponse;
  sources: RetrievedChunk[];
  highestAccessLevel: AccessLevel;
  totalConfidence: number;
}> {
  const response = await generateResponse(
    event,
    query,
    retrievedChunks,
    providerConfig,
  );

  const accessHierarchy: Record<AccessLevel, number> = {
    public: 0,
    internal: 1,
    confidential: 2,
  };

  const highestAccessLevel = retrievedChunks.reduce((highest, chunk) => {
    return accessHierarchy[chunk.accessLevel] >
      accessHierarchy[highest.accessLevel]
      ? chunk
      : highest;
  }).accessLevel;

  return {
    response,
    sources: retrievedChunks,
    highestAccessLevel,
    totalConfidence: response.confidence,
  };
}

/**
 * Mock response for demo without API key
 */
function getMockResponse(
  query: UserQuery,
  retrievedChunks: RetrievedChunk[],
): RAGResponse {
  const sources = retrievedChunks.map((chunk) => ({
    documentId: chunk.documentId,
    title: chunk.documentTitle,
    accessLevel: chunk.accessLevel,
  }));

  const highestAccessLevel = retrievedChunks.reduce((highest, chunk) => {
    const hierarchy: Record<AccessLevel, number> = {
      public: 0,
      internal: 1,
      confidential: 2,
    };
    return hierarchy[chunk.accessLevel] > hierarchy[highest]
      ? chunk.accessLevel
      : highest;
  }, 'public' as AccessLevel);

  let answer = '';
  const queryLower = query.query.toLowerCase();

  if (queryLower.includes('features')) {
    answer =
      'Based on the product documentation [Source 1], our platform offers enterprise-grade security with end-to-end encryption, role-based access control, and SSO support. We also provide seamless API integrations and maintain a 99.9% uptime SLA with 24/7 customer support.';
  } else if (queryLower.includes('roadmap')) {
    answer =
      'According to the Q4 2025 Product Roadmap [Source 1], our strategic priorities include launching mobile apps for iOS and Android in October, releasing an advanced analytics dashboard in November, and introducing GraphQL API v2 in December.';
  } else if (queryLower.includes('financial')) {
    answer =
      'Based on the Q3 2025 Financial Results [Source 1], revenue reached $12.4M, up 45% YoY. ARR grew to $48M from $33M in Q2, with net income of $2.6M (21% margin).';
  } else if (queryLower.includes('security incident')) {
    answer =
      'According to the Security Incident Report [Source 1], on January 15, 2025, the system detected brute-force login attempts targeting admin accounts. The attack was successfully blocked by rate limiting and 2FA requirements, with no data breach occurring.';
  } else {
    answer = `Based on the available documentation, I found ${retrievedChunks.length} relevant source(s) related to your query.`;
  }

  return {
    answer,
    sources,
    accessLevelUsed: highestAccessLevel,
    confidence: 0.85,
    reasoning: `Answer derived from ${sources.length} source document(s).`,
  };
}
