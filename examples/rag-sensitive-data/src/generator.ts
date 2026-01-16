/**
 * Response Generator
 *
 * Generates RAG responses with caching support.
 * Demonstrates:
 * - Response generation with context
 * - Caching for performance optimization
 * - Source attribution and confidence tracking
 */

import {createMullionClient} from '@mullion/ai-sdk';
import {
  RAGResponse,
  type UserQuery,
  type RetrievedChunk,
  type AccessLevel,
} from './schemas.js';
import {getLanguageModel, type ProviderConfig} from './provider.js';

/**
 * Generate response from retrieved documents
 *
 * This function demonstrates caching:
 * - System prompt and document context can be cached
 * - Reduces cost and latency for repeated queries
 */
export async function generateResponse(
  query: UserQuery,
  retrievedChunks: RetrievedChunk[],
  providerConfig?: ProviderConfig,
): Promise<RAGResponse> {
  const model = getLanguageModel(providerConfig);

  if (!model) {
    return getMockResponse(query, retrievedChunks);
  }

  const client = createMullionClient(model);

  const result = await client.scope('generator', async (ctx) => {
    // Build context from retrieved documents
    const context = retrievedChunks
      .map(
        (chunk, i) => `
[Source ${i + 1}: ${chunk.documentTitle} - ${chunk.accessLevel.toUpperCase()}]
${chunk.excerpt}
`,
      )
      .join('\n');

    const systemPrompt = `You are a helpful AI assistant answering questions based on provided context.

IMPORTANT RULES:
1. Only use information from the provided sources
2. Cite sources by number when making claims
3. If the answer isn't in the sources, say "I don't have enough information"
4. Be accurate and concise
5. Do not make up information`;

    const userPrompt = `Context from knowledge base:
${context}

User Question: ${query.query}

Please provide a comprehensive answer based on the context above. Cite your sources and indicate your confidence level.`;

    // Note: In production with Anthropic, you would use caching here:
    // const response = await ctx.infer(RAGResponse, userPrompt, {
    //   cache: {
    //     systemPrompt: { content: systemPrompt, ttl: '1h' },
    //   }
    // });

    const response = await ctx.infer(RAGResponse, userPrompt);

    return ctx.use(response);
  });

  // Handle both wrapped and unwrapped results
  return 'value' in result ? result.value : result;
}

/**
 * Generate response with explicit source tracking
 */
export async function generateResponseWithSources(
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
    query,
    retrievedChunks,
    providerConfig,
  );

  // Determine highest access level used
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

  // Generate mock answer based on query
  let answer = '';
  const queryLower = query.query.toLowerCase();

  if (queryLower.includes('features')) {
    answer =
      'Based on the product documentation [Source 1], our platform offers enterprise-grade security with end-to-end encryption, role-based access control, and SSO support. We also provide seamless API integrations and maintain a 99.9% uptime SLA with 24/7 customer support.';
  } else if (queryLower.includes('roadmap')) {
    answer =
      'According to the Q4 2025 Product Roadmap [Source 1], our strategic priorities include launching mobile apps for iOS and Android in October, releasing an advanced analytics dashboard in November, and introducing GraphQL API v2 in December. The roadmap allocates 12 FTE across engineering teams with a Q4 budget of $480K.';
  } else if (queryLower.includes('financial')) {
    answer =
      'Based on the Q3 2025 Financial Results [Source 1], revenue reached $12.4M, up 45% YoY. ARR grew to $48M from $33M in Q2, with net income of $2.6M (21% margin). The company maintains a strong cash position of $28M with a burn rate of -$1.2M/month. Total customers increased to 1,240, including 34 enterprise customers with >$100K ARR.';
  } else if (queryLower.includes('security incident')) {
    answer =
      'According to the Security Incident Report [Source 1], on January 15, 2025, the system detected brute-force login attempts targeting admin accounts. The attack was successfully blocked by rate limiting and 2FA requirements, with no data breach occurring. The incident was resolved within hours with enhanced security measures implemented, including IP geo-blocking and mandatory password resets for admin accounts.';
  } else {
    answer = `Based on the available documentation, I found ${retrievedChunks.length} relevant source(s) related to your query. The information indicates that ${retrievedChunks[0]?.documentTitle.toLowerCase() || 'the relevant documents'} contain details that may help answer your question.`;
  }

  return {
    answer,
    sources,
    accessLevelUsed: highestAccessLevel,
    confidence: 0.85,
    reasoning: `Answer derived from ${sources.length} source document(s) with access level ${highestAccessLevel}.`,
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('💬 Response Generator Demo\n');

    // Mock retrieved chunks
    const mockChunks: RetrievedChunk[] = [
      {
        documentId: 'doc-pub-001',
        documentTitle: 'Product Features Overview',
        accessLevel: 'public',
        excerpt:
          'Our flagship product offers enterprise-grade security, real-time collaboration, and seamless integration with popular tools...',
        relevanceScore: 0.9,
      },
      {
        documentId: 'doc-pub-003',
        documentTitle: 'Pricing Plans',
        accessLevel: 'public',
        excerpt:
          'We offer three pricing tiers: FREE (up to 5 users), PRO ($29/user/month), and ENTERPRISE (custom pricing)...',
        relevanceScore: 0.7,
      },
    ];

    const query: UserQuery = {
      query: 'What features does the product offer and how much does it cost?',
      userAccessLevel: 'public',
    };

    console.log(`🔎 Query: "${query.query}"`);
    console.log(`👤 User Access: ${query.userAccessLevel.toUpperCase()}\n`);

    console.log('📚 Using sources:');
    mockChunks.forEach((chunk, i) => {
      console.log(
        `   ${i + 1}. ${chunk.documentTitle} (${chunk.accessLevel}, relevance: ${chunk.relevanceScore})`,
      );
    });

    console.log('\n💭 Generating response...\n');

    const result = await generateResponseWithSources(query, mockChunks);

    console.log('📝 Generated Response:\n');
    console.log(`Answer: ${result.response.answer}\n`);
    console.log('Sources:');
    result.response.sources.forEach((source, i) => {
      console.log(
        `   ${i + 1}. ${source.title} (${source.accessLevel.toUpperCase()})`,
      );
    });
    console.log(
      `\nAccess Level Used: ${result.highestAccessLevel.toUpperCase()}`,
    );
    console.log(`Confidence: ${result.totalConfidence.toFixed(2)}`);
    if (result.response.reasoning) {
      console.log(`Reasoning: ${result.response.reasoning}`);
    }

    console.log('\n✅ Response generated successfully!');
  })();
}
