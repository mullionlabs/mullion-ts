/**
 * Documents List API Endpoint
 *
 * GET /api/documents
 *
 * Returns available documents filtered by user access level.
 */

import type {AccessLevel} from '@/schemas';
import {SAMPLE_DOCUMENTS, filterDocumentsByAccess} from '@/mullion/sample-docs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const accessLevel =
    (url.searchParams.get('accessLevel') as AccessLevel) || 'public';

  const accessibleDocs = filterDocumentsByAccess(SAMPLE_DOCUMENTS, accessLevel);

  return Response.json({
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
  });
}
