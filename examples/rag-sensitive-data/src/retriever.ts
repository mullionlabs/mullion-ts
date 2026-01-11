/**
 * Document Retriever
 *
 * Retrieves relevant documents based on user query and access level.
 * Demonstrates:
 * - Scope-based access control
 * - Query analysis
 * - Access-level filtering
 */

import { createMullionClient } from '@mullion/ai-sdk';
import { openai } from '@ai-sdk/openai';
import type { Owned } from '@mullion/core';
import {
  QueryAnalysis,
  type UserQuery,
  type RetrievedChunk,
  type AccessLevel,
} from './schemas.js';
import {
  SAMPLE_DOCUMENTS,
  filterDocumentsByAccess,
  scoreDocumentRelevance,
} from './data/sample-docs.js';

/**
 * Analyze user query to understand intent and required access level
 */
export async function analyzeQuery(
  query: UserQuery
): Promise<Owned<QueryAnalysis, 'query-analysis'>> {
  if (!process.env.OPENAI_API_KEY) {
    return getMockQueryAnalysis(query);
  }

  const client = createMullionClient(openai('gpt-4o-mini'));

  return await client.scope('query-analysis', async (ctx) => {
    const prompt = `Analyze this user query:

Query: ${query.query}
User Access Level: ${query.userAccessLevel}
${query.context ? `Context: ${query.context}` : ''}

Determine:
1. Intent (search, question, summarize, or compare)
2. Key terms/keywords to search for
3. Minimum access level needed to answer this query fully
4. Relevant document categories

Consider:
- Does the query ask for internal or confidential information?
- What topics/categories are relevant?
- What are the main search keywords?`;

    const analysis = await ctx.infer(QueryAnalysis, prompt);

    return ctx.use(analysis);
  });
}

/**
 * Retrieve relevant documents based on query and user access level
 *
 * This function demonstrates:
 * - Access-level filtering (security)
 * - Relevance scoring
 * - Result ranking
 */
export async function retrieveDocuments(
  query: UserQuery,
  topK: number = 3
): Promise<RetrievedChunk[]> {
  console.log(`\n🔍 Retrieving documents for query: "${query.query}"`);
  console.log(`   User Access Level: ${query.userAccessLevel.toUpperCase()}`);

  // Step 1: Filter documents by user's access level
  const accessibleDocs = filterDocumentsByAccess(
    SAMPLE_DOCUMENTS,
    query.userAccessLevel
  );

  console.log(
    `   Accessible Documents: ${accessibleDocs.length}/${SAMPLE_DOCUMENTS.length}`
  );

  // Step 2: Score documents by relevance
  const scoredDocs = accessibleDocs.map((doc) => ({
    document: doc,
    score: scoreDocumentRelevance(doc, query.query),
  }));

  // Step 3: Sort by relevance and take top K
  const topDocs = scoredDocs
    .filter((d) => d.score > 0.1) // Minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  console.log(`   Top ${topK} Relevant Documents:`);
  topDocs.forEach((d, i) => {
    console.log(
      `   ${i + 1}. ${d.document.title} (score: ${d.score.toFixed(2)}, level: ${d.document.accessLevel})`
    );
  });

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
 * Helper: Extract relevant excerpt from document
 */
function extractRelevantExcerpt(content: string, query: string): string {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();

  // Find first occurrence of any query word
  const words = queryLower.split(' ').filter((w) => w.length > 3);
  let bestIndex = -1;

  for (const word of words) {
    const index = contentLower.indexOf(word);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  }

  // Extract 200 characters around the match
  if (bestIndex !== -1) {
    const start = Math.max(0, bestIndex - 100);
    const end = Math.min(content.length, bestIndex + 100);
    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  // If no match, return first 200 characters
  return content.substring(0, 200) + (content.length > 200 ? '...' : '');
}

/**
 * Mock query analysis for demo without API key
 */
function getMockQueryAnalysis(
  query: UserQuery
): Owned<QueryAnalysis, 'query-analysis'> {
  const queryLower = query.query.toLowerCase();

  // Determine intent
  let intent: 'search' | 'question' | 'summarize' | 'compare' = 'question';
  if (queryLower.includes('find') || queryLower.includes('search'))
    intent = 'search';
  if (queryLower.includes('summarize') || queryLower.includes('overview'))
    intent = 'summarize';
  if (queryLower.includes('compare') || queryLower.includes('difference'))
    intent = 'compare';

  // Extract keywords
  const keywords = query.query
    .toLowerCase()
    .split(' ')
    .filter((w) => w.length > 3);

  // Determine required access level
  let requiredAccessLevel: AccessLevel = 'public';
  if (
    queryLower.includes('financial') ||
    queryLower.includes('confidential') ||
    queryLower.includes('acquisition') ||
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

  // Determine categories
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

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📚 Document Retriever Demo\n');

  const testQueries: UserQuery[] = [
    {
      query: 'What are the product features?',
      userAccessLevel: 'public',
    },
    {
      query: 'What is our Q4 roadmap?',
      userAccessLevel: 'internal',
    },
    {
      query: 'What were our Q3 financial results?',
      userAccessLevel: 'confidential',
    },
    {
      query: 'Tell me about the security incident',
      userAccessLevel: 'confidential',
    },
  ];

  for (const query of testQueries) {
    console.log('\n' + '='.repeat(60));
    console.log(`\n🔎 Query: "${query.query}"`);
    console.log(`👤 User Access: ${query.userAccessLevel.toUpperCase()}\n`);

    // Analyze query
    const analysis = await analyzeQuery(query);
    console.log('📊 Query Analysis:');
    console.log(`   Intent: ${analysis.value.intent}`);
    console.log(`   Keywords: ${analysis.value.keywords.join(', ')}`);
    console.log(`   Required Access: ${analysis.value.requiredAccessLevel}`);
    console.log(`   Categories: ${analysis.value.categories.join(', ')}`);
    console.log(`   Confidence: ${analysis.confidence.toFixed(2)}`);

    // Check access
    if (
      query.userAccessLevel === 'public' &&
      analysis.value.requiredAccessLevel !== 'public'
    ) {
      console.log('\n⛔ ACCESS DENIED: User lacks required access level');
      continue;
    }

    // Retrieve documents
    const chunks = await retrieveDocuments(query, 3);

    console.log(`\n📄 Retrieved ${chunks.length} documents:`);
    chunks.forEach((chunk, i) => {
      console.log(`\n${i + 1}. ${chunk.documentTitle}`);
      console.log(`   Level: ${chunk.accessLevel.toUpperCase()}`);
      console.log(`   Relevance: ${chunk.relevanceScore.toFixed(2)}`);
      console.log(
        `   Excerpt: ${chunk.excerpt.substring(0, 100)}${chunk.excerpt.length > 100 ? '...' : ''}`
      );
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');
}
