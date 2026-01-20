/**
 * Documents List API Endpoint
 *
 * GET /api/documents
 *
 * Returns available documents filtered by user access level.
 */

import {defineEventHandler, getQuery} from 'h3';
import type {AccessLevel} from '~~/schemas';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const accessLevel = (query.accessLevel as AccessLevel) || 'public';

  const accessibleDocs = filterDocumentsByAccess(SAMPLE_DOCUMENTS, accessLevel);

  return {
    success: true,
    data: {
      accessLevel,
      totalDocuments: SAMPLE_DOCUMENTS.length,
      accessibleDocuments: accessibleDocs.length,
      documents: accessibleDocs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        accessLevel: doc.accessLevel,
        tags: doc.tags,
        contentPreview: doc.content.substring(0, 150) + '...',
      })),
    },
  };
});
