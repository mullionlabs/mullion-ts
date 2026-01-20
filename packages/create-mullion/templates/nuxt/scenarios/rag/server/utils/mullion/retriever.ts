/**
 * Document Retriever
 *
 * Retrieves relevant documents based on user query and access level.
 * Demonstrates scope-based access control and query analysis.
 */

import type {H3Event} from 'h3';
import {createMullionClient} from '@mullion/ai-sdk';
import type {Owned} from '@mullion/core';
import {QueryAnalysis} from '~~/schemas';
import type {UserQuery, RetrievedChunk, AccessLevel} from '~~/schemas';
import {
  SAMPLE_DOCUMENTS,
  filterDocumentsByAccess,
  scoreDocumentRelevance,
} from './sample-docs';
import type {ProviderConfig} from './provider';

/**
 * Analyze user query to understand intent and required access level
 * @param event - H3 event from the API route
 * @param query - User query to analyze
 * @param providerConfig - Optional provider configuration
 */
export async function analyzeQuery(
  event: H3Event,
  query: UserQuery,
  providerConfig?: ProviderConfig,
): Promise<Owned<QueryAnalysis, 'query-analysis'>> {
  const model = getLanguageModel(event, providerConfig);

  if (!model) {
    return getMockQueryAnalysis(query);
  }

  const client = createMullionClient(
    model,
    getMullionClientOptions(event, providerConfig),
  );

  const result = await client.scope('query-analysis', async (ctx) => {
    const prompt = `Analyze this user query:

Query: ${query.query}
User Access Level: ${query.userAccessLevel}
${query.context ? `Context: ${query.context}` : ''}

Determine:
1. Intent (search, question, summarize, or compare)
2. Key terms/keywords to search for
3. Minimum access level needed to answer this query fully
4. Relevant document categories`;

    const analysis = await ctx.infer(QueryAnalysis, prompt);
    return analysis;
  });

  return result;
}

/**
 * Retrieve relevant documents based on query and user access level
 */
export async function retrieveDocuments(
  query: UserQuery,
  topK: number = 3,
): Promise<RetrievedChunk[]> {
  // Step 1: Filter documents by user's access level
  const accessibleDocs = filterDocumentsByAccess(
    SAMPLE_DOCUMENTS,
    query.userAccessLevel,
  );

  // Step 2: Score documents by relevance
  const scoredDocs = accessibleDocs.map((doc) => ({
    document: doc,
    score: scoreDocumentRelevance(doc, query.query),
  }));

  // Step 3: Sort by relevance and take top K
  const topDocs = scoredDocs
    .filter((d) => d.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Step 4: Create retrieved chunks
  return topDocs.map((d) => ({
    documentId: d.document.id,
    documentTitle: d.document.title,
    accessLevel: d.document.accessLevel,
    excerpt: extractRelevantExcerpt(d.document.content, query.query),
    relevanceScore: d.score,
  }));
}

/**
 * Extract relevant excerpt from document
 */
function extractRelevantExcerpt(content: string, query: string): string {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();

  const words = queryLower.split(' ').filter((w) => w.length > 3);
  let bestIndex = -1;

  for (const word of words) {
    const index = contentLower.indexOf(word);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  }

  if (bestIndex !== -1) {
    const start = Math.max(0, bestIndex - 100);
    const end = Math.min(content.length, bestIndex + 100);
    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  return content.substring(0, 200) + (content.length > 200 ? '...' : '');
}

/**
 * Mock query analysis for demo without API key
 */
function getMockQueryAnalysis(
  query: UserQuery,
): Owned<QueryAnalysis, 'query-analysis'> {
  const queryLower = query.query.toLowerCase();

  let intent: 'search' | 'question' | 'summarize' | 'compare' = 'question';
  if (queryLower.includes('find') || queryLower.includes('search'))
    intent = 'search';
  if (queryLower.includes('summarize') || queryLower.includes('overview'))
    intent = 'summarize';
  if (queryLower.includes('compare') || queryLower.includes('difference'))
    intent = 'compare';

  const keywords = query.query
    .toLowerCase()
    .split(' ')
    .filter((w) => w.length > 3);

  let requiredAccessLevel: AccessLevel = 'public';
  if (
    queryLower.includes('financial') ||
    queryLower.includes('confidential') ||
    queryLower.includes('security incident')
  ) {
    requiredAccessLevel = 'confidential';
  } else if (
    queryLower.includes('roadmap') ||
    queryLower.includes('internal') ||
    queryLower.includes('employee')
  ) {
    requiredAccessLevel = 'internal';
  }

  const categories: string[] = [];
  if (queryLower.includes('product')) categories.push('product');
  if (queryLower.includes('price') || queryLower.includes('pricing'))
    categories.push('pricing');
  if (queryLower.includes('financial') || queryLower.includes('revenue'))
    categories.push('finance');
  if (queryLower.includes('roadmap') || queryLower.includes('plan'))
    categories.push('planning');

  return {
    value: {
      intent,
      keywords: keywords.slice(0, 5),
      requiredAccessLevel,
      categories: categories.length > 0 ? categories : ['general'],
    },
    confidence: 0.85,
    __scope: 'query-analysis',
    traceId: `trace-${Date.now()}`,
  };
}
