/**
 * Schemas for RAG Sensitive Data Example
 *
 * This file defines Zod schemas for document classification,
 * query processing, and response generation in a RAG pipeline
 * with access-level aware document handling.
 */

import { z } from 'zod';

/**
 * Access levels for documents
 */
export const AccessLevel = z.enum(['public', 'internal', 'confidential']);
export type AccessLevel = z.infer<typeof AccessLevel>;

/**
 * Document metadata with access control
 */
export const DocumentMetadata = z.object({
  id: z.string().describe('Unique document identifier'),
  title: z.string().describe('Document title'),
  accessLevel: AccessLevel.describe('Access level of the document'),
  tags: z.array(z.string()).describe('Document tags for categorization'),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadata>;

/**
 * Full document with content and metadata
 */
export const Document = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().describe('Full document content'),
  accessLevel: AccessLevel,
  tags: z.array(z.string()),
});

export type Document = z.infer<typeof Document>;

/**
 * Document classification result
 *
 * Used by the classifier to determine appropriate access level
 * and sensitivity indicators for a document.
 */
export const DocumentClassification = z.object({
  accessLevel: AccessLevel.describe('Determined access level for the document'),
  reasoning: z.string().describe('Explanation for the classification decision'),
  sensitiveTopics: z
    .array(z.string())
    .describe(
      'List of sensitive topics found (e.g., PII, financial data, trade secrets)'
    ),
  requiresRedaction: z
    .boolean()
    .describe('Whether document needs redaction before broader sharing'),
});

export type DocumentClassification = z.infer<typeof DocumentClassification>;

/**
 * User query with access context
 */
export const UserQuery = z.object({
  query: z.string().describe('User question or search query'),
  userAccessLevel: AccessLevel.describe("User's maximum access level"),
  context: z.string().optional().describe('Additional context for the query'),
});

export type UserQuery = z.infer<typeof UserQuery>;

/**
 * Query analysis result
 *
 * Analyzes what the user is asking for and determines
 * which documents might be relevant.
 */
export const QueryAnalysis = z.object({
  intent: z
    .enum(['search', 'question', 'summarize', 'compare'])
    .describe('Type of query'),
  keywords: z.array(z.string()).describe('Key terms extracted from query'),
  requiredAccessLevel: AccessLevel.describe(
    'Minimum access level needed to answer this query'
  ),
  categories: z
    .array(z.string())
    .describe('Document categories relevant to this query'),
});

export type QueryAnalysis = z.infer<typeof QueryAnalysis>;

/**
 * Retrieved document chunk with relevance score
 */
export const RetrievedChunk = z.object({
  documentId: z.string(),
  documentTitle: z.string(),
  accessLevel: AccessLevel,
  excerpt: z.string().describe('Relevant excerpt from the document'),
  relevanceScore: z.number().min(0).max(1).describe('Relevance score (0-1)'),
});

export type RetrievedChunk = z.infer<typeof RetrievedChunk>;

/**
 * RAG response with source attribution
 */
export const RAGResponse = z.object({
  answer: z.string().describe('Generated answer to the user query'),
  sources: z
    .array(
      z.object({
        documentId: z.string(),
        title: z.string(),
        accessLevel: AccessLevel,
      })
    )
    .describe('Source documents used to generate the answer'),
  accessLevelUsed: AccessLevel.describe('Highest access level of sources used'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the answer (0-1)'),
  reasoning: z
    .string()
    .optional()
    .describe('Explanation of how the answer was derived'),
});

export type RAGResponse = z.infer<typeof RAGResponse>;

/**
 * Fork result for parallel document processing
 */
export const ForkProcessingResult = z.object({
  documentId: z.string(),
  classification: DocumentClassification,
  processingTime: z.number().describe('Processing time in milliseconds'),
  cacheHit: z.boolean().describe('Whether result was cached'),
});

export type ForkProcessingResult = z.infer<typeof ForkProcessingResult>;

/**
 * Merged classification consensus
 *
 * When multiple AI models classify the same document,
 * this schema represents the merged/consensus result.
 */
export const ClassificationConsensus = z.object({
  finalAccessLevel: AccessLevel.describe(
    'Consensus access level (most restrictive wins)'
  ),
  agreementScore: z
    .number()
    .min(0)
    .max(1)
    .describe('How much the models agreed (0-1)'),
  participatingModels: z
    .array(z.string())
    .describe('Models that participated in classification'),
  sensitiveTopics: z
    .array(z.string())
    .describe('Union of all sensitive topics found'),
});

export type ClassificationConsensus = z.infer<typeof ClassificationConsensus>;
