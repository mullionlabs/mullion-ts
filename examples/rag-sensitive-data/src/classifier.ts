/**
 * Document Classifier
 *
 * Classifies documents into access levels using Mullion's fork/merge pattern.
 * Demonstrates:
 * - Parallel classification with multiple models (fork)
 * - Consensus building (merge)
 * - Scope-based tracking of classification results
 */

import { createMullionClient } from '@mullion/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { fork } from '@mullion/core';
import {
  DocumentClassification,
  ClassificationConsensus,
  type Document,
  type AccessLevel,
} from './schemas.js';

/**
 * Classify a single document using AI
 */
export async function classifyDocument(
  document: Document,
  modelName: string = 'gpt-4o-mini'
): Promise<{ classification: DocumentClassification; confidence: number }> {
  if (!process.env.OPENAI_API_KEY) {
    // Return mock classification for demo
    return getMockClassification(document);
  }

  const client = createMullionClient(openai(modelName));

  const result = await client.scope('classifier', async (ctx) => {
    const prompt = `Analyze this document and classify its access level.

Document Title: ${document.title}
Content:
${document.content}

Determine:
1. Access Level (public, internal, or confidential)
2. Reasoning for the classification
3. Any sensitive topics found
4. Whether it requires redaction

Classification criteria:
- PUBLIC: General information, marketing materials, public documentation
- INTERNAL: Employee-only info, project plans, internal processes
- CONFIDENTIAL: Financial data, legal documents, trade secrets, security details, M&A discussions`;

    const classification = await ctx.infer(DocumentClassification, prompt);

    return ctx.use(classification);
  });

  return {
    classification: result.value,
    confidence: result.confidence,
  };
}

/**
 * Classify document using multiple models in parallel (fork pattern)
 *
 * This demonstrates Mullion's fork/merge capability for consensus building.
 */
export async function classifyDocumentWithConsensus(
  document: Document
): Promise<ClassificationConsensus> {
  if (!process.env.OPENAI_API_KEY) {
    return getMockConsensus(document);
  }

  const client = createMullionClient(openai('gpt-4o-mini'));

  // Fork: classify with multiple models in parallel
  const results = await fork(client, 'classifier', {
    strategy: 'fast-parallel',
    branches: {
      model1: async (ctx) => {
        const prompt = buildClassificationPrompt(document);
        return await ctx.infer(DocumentClassification, prompt);
      },
      model2: async (ctx) => {
        const prompt = buildClassificationPrompt(document);
        return await ctx.infer(DocumentClassification, prompt);
      },
      model3: async (ctx) => {
        const prompt = buildClassificationPrompt(document);
        return await ctx.infer(DocumentClassification, prompt);
      },
    },
  });

  // Merge: build consensus from results
  const classifications = Object.values(results).map((r) => r.value);

  // Most restrictive access level wins
  const accessLevels = classifications.map((c) => c.accessLevel);
  const finalAccessLevel = getMostRestrictive(accessLevels);

  // Calculate agreement score
  const agreementScore = calculateAgreement(accessLevels);

  // Combine all sensitive topics
  const allTopics = new Set<string>();
  classifications.forEach((c) => {
    c.sensitiveTopics.forEach((topic) => allTopics.add(topic));
  });

  return {
    finalAccessLevel,
    agreementScore,
    participatingModels: ['gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini'],
    sensitiveTopics: Array.from(allTopics),
  };
}

/**
 * Helper: Build classification prompt
 */
function buildClassificationPrompt(document: Document): string {
  return `Analyze this document and classify its access level.

Document Title: ${document.title}
Content:
${document.content.substring(0, 2000)}${document.content.length > 2000 ? '...' : ''}

Determine:
1. Access Level (public, internal, or confidential)
2. Reasoning for the classification
3. Any sensitive topics found (PII, financial data, trade secrets, security details, legal matters)
4. Whether it requires redaction

Classification criteria:
- PUBLIC: General information, marketing materials, public documentation
- INTERNAL: Employee-only info, project plans, internal processes (not customer-facing)
- CONFIDENTIAL: Financial data, legal documents, trade secrets, security details, M&A discussions, executive-only`;
}

/**
 * Helper: Get most restrictive access level
 */
function getMostRestrictive(levels: AccessLevel[]): AccessLevel {
  if (levels.includes('confidential')) return 'confidential';
  if (levels.includes('internal')) return 'internal';
  return 'public';
}

/**
 * Helper: Calculate agreement score
 */
function calculateAgreement(levels: AccessLevel[]): number {
  const counts = levels.reduce(
    (acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const maxCount = Math.max(...Object.values(counts));
  return maxCount / levels.length;
}

/**
 * Mock classification for demo without API key
 */
function getMockClassification(document: Document): {
  classification: DocumentClassification;
  confidence: number;
} {
  // Use actual access level from document for realistic demo
  return {
    classification: {
      accessLevel: document.accessLevel,
      reasoning: `Document contains ${document.accessLevel} information based on content analysis.`,
      sensitiveTopics:
        document.accessLevel === 'confidential'
          ? ['financial data', 'trade secrets']
          : document.accessLevel === 'internal'
            ? ['internal processes']
            : [],
      requiresRedaction: document.accessLevel === 'confidential',
    },
    confidence: 0.85,
  };
}

/**
 * Mock consensus for demo without API key
 */
function getMockConsensus(document: Document): ClassificationConsensus {
  return {
    finalAccessLevel: document.accessLevel,
    agreementScore: 0.9,
    participatingModels: ['mock-model-1', 'mock-model-2', 'mock-model-3'],
    sensitiveTopics:
      document.accessLevel === 'confidential'
        ? ['financial data', 'trade secrets', 'legal information']
        : document.accessLevel === 'internal'
          ? ['internal processes', 'employee data']
          : [],
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { SAMPLE_DOCUMENTS } = await import('./data/sample-docs.js');

  console.log('🔍 Document Classifier Demo\n');

  // Classify first document from each access level
  const testDocs = [
    SAMPLE_DOCUMENTS.find((d) => d.accessLevel === 'public')!,
    SAMPLE_DOCUMENTS.find((d) => d.accessLevel === 'internal')!,
    SAMPLE_DOCUMENTS.find((d) => d.accessLevel === 'confidential')!,
  ];

  for (const doc of testDocs) {
    console.log(`📄 Document: ${doc.title}`);
    console.log(`   Actual Level: ${doc.accessLevel.toUpperCase()}\n`);

    const { classification, confidence } = await classifyDocument(doc);
    console.log(
      `   Classified as: ${classification.accessLevel.toUpperCase()}`
    );
    console.log(`   Confidence: ${confidence.toFixed(2)}`);
    console.log(`   Reasoning: ${classification.reasoning}`);
    if (classification.sensitiveTopics.length > 0) {
      console.log(
        `   Sensitive Topics: ${classification.sensitiveTopics.join(', ')}`
      );
    }
    console.log();
  }

  // Demonstrate consensus classification
  console.log('🔀 Consensus Classification (Fork/Merge)\n');
  const testDoc = SAMPLE_DOCUMENTS.find(
    (d) => d.accessLevel === 'confidential'
  )!;
  console.log(`📄 Document: ${testDoc.title}\n`);

  const consensus = await classifyDocumentWithConsensus(testDoc);
  console.log(
    `   Final Access Level: ${consensus.finalAccessLevel.toUpperCase()}`
  );
  console.log(`   Agreement Score: ${consensus.agreementScore.toFixed(2)}`);
  console.log(
    `   Participating Models: ${consensus.participatingModels.join(', ')}`
  );
  console.log(`   Sensitive Topics: ${consensus.sensitiveTopics.join(', ')}`);
}
