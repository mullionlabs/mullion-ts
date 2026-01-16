/**
 * @mullion/template-rag-sensitive-data
 *
 * Reusable RAG pipeline with access-level aware document handling.
 * Can be imported into demo apps or generated projects.
 */

// ============================================================================
// Schemas
// ============================================================================
export type {
  AccessLevel,
  Document,
  DocumentMetadata,
  DocumentClassification,
  UserQuery,
  QueryAnalysis,
  RetrievedChunk,
  RAGResponse,
  ForkProcessingResult,
  ClassificationConsensus,
} from './schemas.js';

export {
  AccessLevel as AccessLevelSchema,
  Document as DocumentSchema,
  DocumentMetadata as DocumentMetadataSchema,
  DocumentClassification as DocumentClassificationSchema,
  UserQuery as UserQuerySchema,
  QueryAnalysis as QueryAnalysisSchema,
  RetrievedChunk as RetrievedChunkSchema,
  RAGResponse as RAGResponseSchema,
  ForkProcessingResult as ForkProcessingResultSchema,
  ClassificationConsensus as ClassificationConsensusSchema,
} from './schemas.js';

// ============================================================================
// Pipeline & Components
// ============================================================================
export {executeRAGPipeline, type RAGPipelineResult} from './pipeline.js';

export {classifyDocument, classifyDocumentWithConsensus} from './classifier.js';

export {analyzeQuery, retrieveDocuments} from './retriever.js';

export {generateResponse, generateResponseWithSources} from './generator.js';

// ============================================================================
// Provider Utilities
// ============================================================================
export {
  getLanguageModel,
  getProviderName,
  type ProviderConfig,
  type ProviderType,
} from './provider.js';

// ============================================================================
// Sample Data & Utilities
// ============================================================================
export {
  SAMPLE_DOCUMENTS as sampleDocuments,
  filterDocumentsByAccess,
  getDocumentsByTag,
  scoreDocumentRelevance,
} from './data/sample-docs.js';
