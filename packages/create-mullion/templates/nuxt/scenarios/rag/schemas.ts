/**
 * Shared RAG Schemas
 *
 * Zod schemas for document classification, query processing,
 * and response generation used across server and client.
 */

import {z} from 'zod';

/**
 * Access levels for documents
 */
export const AccessLevel = z.enum(['public', 'internal', 'confidential']);
export type AccessLevel = z.infer<typeof AccessLevel>;

/**
 * Source document metadata for responses
 */
export const RAGSource = z.object({
  documentId: z.string(),
  title: z.string(),
  accessLevel: AccessLevel,
});

export type RAGSource = z.infer<typeof RAGSource>;

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
 */
export const QueryAnalysis = z.object({
  intent: z
    .enum(['search', 'question', 'summarize', 'compare'])
    .describe('Type of query'),
  keywords: z.array(z.string()).describe('Key terms extracted from query'),
  requiredAccessLevel: AccessLevel.describe(
    'Minimum access level needed to answer this query',
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
    .array(RAGSource)
    .describe('Source documents used to generate the answer'),
  accessLevelUsed: AccessLevel.describe('Highest access level of sources used'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the answer (0-1)'),
  reasoning: z.string().describe('Explanation of how the answer was derived'),
});

export type RAGResponse = z.infer<typeof RAGResponse>;

/**
 * API response shape for /api/query
 */
export const QueryResponse = z.object({
  success: z.boolean(),
  data: z.object({
    answer: z.string(),
    sources: z.array(RAGSource),
    confidence: z.number().min(0).max(1),
    accessLevel: AccessLevel,
    metrics: z.object({
      documentsRetrieved: z.number(),
      documentsUsed: z.number(),
      executionTimeMs: z.number(),
    }),
  }),
});

export type QueryResponse = z.infer<typeof QueryResponse>;
