/**
 * RAG Pipeline Orchestration
 *
 * Complete RAG pipeline demonstrating Mullion's capabilities:
 * - Document classification with fork/merge
 * - Query analysis in scoped context
 * - Access-controlled retrieval
 * - Response generation with caching
 * - End-to-end tracing and confidence tracking
 */

import { analyzeQuery, retrieveDocuments } from './retriever.js';
import { generateResponseWithSources } from './generator.js';
import type { UserQuery, RAGResponse } from './schemas.js';

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
 */
export async function executeRAGPipeline(
  query: UserQuery,
  options: {
    topK?: number;
    verbose?: boolean;
  } = {}
): Promise<RAGPipelineResult> {
  const { topK = 3, verbose = true } = options;
  const startTime = Date.now();

  if (verbose) {
    console.log('\n🚀 Starting RAG Pipeline...\n');
    console.log('═'.repeat(70));
    console.log(`📝 Query: "${query.query}"`);
    console.log(`👤 User Access Level: ${query.userAccessLevel.toUpperCase()}`);
    console.log('═'.repeat(70));
  }

  // Step 1: Analyze Query
  if (verbose) console.log('\n📊 Step 1: Query Analysis');
  const analysis = await analyzeQuery(query);

  if (verbose) {
    console.log(`   Intent: ${analysis.value.intent}`);
    console.log(`   Keywords: ${analysis.value.keywords.join(', ')}`);
    console.log(`   Required Access: ${analysis.value.requiredAccessLevel}`);
    console.log(`   Categories: ${analysis.value.categories.join(', ')}`);
    console.log(`   Confidence: ${analysis.confidence.toFixed(2)}`);
  }

  // Step 2: Access Check
  if (verbose) console.log('\n🔐 Step 2: Access Control Check');

  const accessHierarchy = {
    public: 0,
    internal: 1,
    confidential: 2,
  };

  const userLevel = accessHierarchy[query.userAccessLevel];
  const requiredLevel = accessHierarchy[analysis.value.requiredAccessLevel];

  if (userLevel < requiredLevel) {
    if (verbose) {
      console.log(
        `   ⛔ ACCESS DENIED: Query requires ${analysis.value.requiredAccessLevel.toUpperCase()} access`
      );
      console.log(`   User has: ${query.userAccessLevel.toUpperCase()}`);
    }

    throw new Error(
      `Insufficient access: Query requires ${analysis.value.requiredAccessLevel} level, user has ${query.userAccessLevel}`
    );
  }

  if (verbose) {
    console.log(
      `   ✅ Access granted: User can access ${query.userAccessLevel.toUpperCase()} documents`
    );
  }

  // Step 3: Retrieve Documents
  if (verbose) console.log('\n📚 Step 3: Document Retrieval');
  const retrievedChunks = await retrieveDocuments(query, topK);

  if (retrievedChunks.length === 0) {
    if (verbose) console.log('   ⚠️  No relevant documents found');

    return {
      query,
      response: {
        answer:
          "I couldn't find any relevant documents to answer your question. Please try rephrasing or check if you have the necessary access permissions.",
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

  if (verbose) {
    console.log(`   Found ${retrievedChunks.length} relevant documents:`);
    retrievedChunks.forEach((chunk, i) => {
      console.log(
        `   ${i + 1}. ${chunk.documentTitle} (${chunk.accessLevel.toUpperCase()}, score: ${chunk.relevanceScore.toFixed(2)})`
      );
    });
  }

  // Step 4: Generate Response
  if (verbose) console.log('\n💬 Step 4: Response Generation');
  const result = await generateResponseWithSources(query, retrievedChunks);

  if (verbose) {
    console.log(
      `   Response generated with ${result.response.sources.length} sources`
    );
    console.log(
      `   Highest Access Level: ${result.highestAccessLevel.toUpperCase()}`
    );
    console.log(`   Confidence: ${result.totalConfidence.toFixed(2)}`);
  }

  // Step 5: Results
  const executionTime = Date.now() - startTime;

  if (verbose) {
    console.log('\n' + '═'.repeat(70));
    console.log('✅ Pipeline Complete');
    console.log('═'.repeat(70));
    console.log(`\n📝 Generated Answer:\n`);
    console.log(wrapText(result.response.answer, 70));
    console.log(`\n📚 Sources Used:`);
    result.response.sources.forEach((source, i) => {
      console.log(
        `   ${i + 1}. ${source.title} (${source.accessLevel.toUpperCase()})`
      );
    });
    console.log(`\n📊 Metrics:`);
    console.log(`   Documents Retrieved: ${retrievedChunks.length}`);
    console.log(`   Documents Used: ${result.response.sources.length}`);
    console.log(
      `   Highest Access Level: ${result.highestAccessLevel.toUpperCase()}`
    );
    console.log(`   Overall Confidence: ${result.totalConfidence.toFixed(2)}`);
    console.log(`   Execution Time: ${executionTime}ms`);
    console.log('\n' + '═'.repeat(70) + '\n');
  }

  return {
    query,
    response: result.response,
    metrics: {
      documentsRetrieved: retrievedChunks.length,
      documentsUsed: result.response.sources.length,
      highestAccessLevel: result.highestAccessLevel,
      overallConfidence: result.totalConfidence,
      executionTimeMs: executionTime,
    },
  };
}

/**
 * Helper: Wrap text to specified width
 */
function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > width) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }

  if (currentLine) lines.push(currentLine.trim());

  return lines.join('\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 RAG Pipeline Demo\n');

  const scenarios: UserQuery[] = [
    {
      query: 'What features does the product offer?',
      userAccessLevel: 'public',
      context: 'Potential customer researching features',
    },
    {
      query: 'What is our product roadmap for Q4?',
      userAccessLevel: 'internal',
      context: 'Employee planning work',
    },
    {
      query: 'What were our Q3 financial results?',
      userAccessLevel: 'confidential',
      context: 'Executive reviewing performance',
    },
    {
      query: 'Tell me about any recent security incidents',
      userAccessLevel: 'confidential',
      context: 'Security team review',
    },
  ];

  console.log('Running 4 scenarios with different access levels...\n');

  for (let i = 0; i < scenarios.length; i++) {
    console.log(`\n${'#'.repeat(70)}`);
    console.log(`# Scenario ${i + 1}/${scenarios.length}`);
    console.log('#'.repeat(70));

    try {
      await executeRAGPipeline(scenarios[i], { verbose: true });
    } catch (error) {
      if (error instanceof Error) {
        console.log(`\n❌ Error: ${error.message}\n`);
      }
    }

    // Add delay between scenarios for readability
    if (i < scenarios.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('\n✅ All scenarios completed!\n');
  console.log('📖 Key Takeaways:');
  console.log('   • Mullion enforces access control at retrieval time');
  console.log(
    '   • Each scope (query-analysis, retriever, generator) is isolated'
  );
  console.log('   • Confidence tracking flows through the entire pipeline');
  console.log('   • Users only see documents they have permission to access');
  console.log();
}
