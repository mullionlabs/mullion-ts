#!/usr/bin/env tsx

/**
 * Mullion Example: RAG with Sensitive Data
 *
 * This example demonstrates a complete RAG pipeline with access-level
 * aware document retrieval and response generation.
 *
 * 🎯 Learning Objectives:
 * 1. Document classification with fork/merge consensus
 * 2. Query analysis in scoped contexts
 * 3. Access-controlled document retrieval
 * 4. Response generation with source attribution
 * 5. End-to-end pipeline orchestration
 *
 * 📚 Files in this example:
 * - schemas.ts - Zod schemas for all data structures
 * - data/sample-docs.ts - Sample documents with different access levels
 * - classifier.ts - Document classification with fork/merge
 * - retriever.ts - Query analysis and document retrieval
 * - generator.ts - Response generation with caching
 * - pipeline.ts - Complete RAG orchestration
 * - index.ts - This file (interactive demo)
 */

console.log('🎯 Mullion Example: RAG with Sensitive Data\n');

console.log('This example demonstrates a production-ready RAG pipeline');
console.log('with access-level aware document handling using Mullion.\n');

console.log('📖 Scenario:');
console.log(
  '   A corporate knowledge base with documents at different access levels:',
);
console.log('   • PUBLIC: Product docs, marketing materials');
console.log('   • INTERNAL: Employee handbooks, project plans');
console.log(
  '   • CONFIDENTIAL: Financial data, trade secrets, security incidents\n',
);

console.log('🔍 What Mullion Provides:');
console.log('   • Scope isolation for each pipeline stage');
console.log('   • Access-level enforcement at retrieval time');
console.log('   • Document classification with fork/merge consensus');
console.log('   • Confidence tracking throughout the pipeline');
console.log('   • Source attribution and traceability\n');

console.log('📂 Pipeline Stages:\n');
console.log('   1. Query Analysis → Understand user intent');
console.log('   2. Access Control → Verify permissions');
console.log(
  '   3. Document Retrieval → Find relevant docs within access level',
);
console.log(
  '   4. Response Generation → Create answer with source attribution\n',
);

console.log('📂 Available Commands:\n');
console.log('   npm start              - Show this help');
console.log('   npm run pipeline       - Run complete RAG pipeline');
console.log('   npm run classify       - Run document classifier demo');
console.log('   npm run lint           - Check for context leaks with ESLint');
console.log('   npm run typecheck      - Run TypeScript type checking\n');

console.log('🚀 Quick Start:\n');
console.log('   1. Copy .env.example to .env (optional)');
console.log('   2. Add your OPENAI_API_KEY (optional - works without it)');
console.log('   3. Run: npm run pipeline\n');

console.log('💡 Key Features Demonstrated:\n');
console.log(
  '   ✅ FORK/MERGE: Parallel classification with consensus building',
);
console.log('   ✅ ACCESS CONTROL: Automatic filtering by user permissions');
console.log('   ✅ SCOPED CONTEXTS: Each stage runs in isolated scope');
console.log('   ✅ CONFIDENCE: Track quality throughout pipeline');
console.log('   ✅ CACHING: Optimize performance for repeated queries\n');

console.log('📊 Example Queries by Access Level:\n');
console.log('   PUBLIC user:');
console.log('   → "What features does the product offer?"');
console.log('   → Result: Access to marketing docs, product features\n');

console.log('   INTERNAL user:');
console.log('   → "What is our Q4 product roadmap?"');
console.log('   → Result: Access to internal planning documents\n');

console.log('   CONFIDENTIAL user:');
console.log('   → "What were our Q3 financial results?"');
console.log('   → Result: Access to financial data and executive reports\n');

console.log('🎓 Learning Path:\n');
console.log('   1. Read src/schemas.ts to understand data structures');
console.log('   2. Explore src/data/sample-docs.ts for example documents');
console.log('   3. Study src/classifier.ts to see fork/merge pattern');
console.log('   4. Review src/retriever.ts for access control');
console.log('   5. Examine src/generator.ts for response generation');
console.log('   6. Run src/pipeline.ts to see it all together\n');

console.log('📖 Learn More:');
console.log('   Documentation: https://github.com/mullionlabs/mullion-ts');
console.log(
  '   Report Issues: https://github.com/mullionlabs/mullion-ts/issues\n',
);

console.log('---\n');
console.log(
  '💡 TIP: Start with "npm run pipeline" to see the complete RAG flow,',
);
console.log(
  '    then explore individual components to understand each stage!\n',
);
