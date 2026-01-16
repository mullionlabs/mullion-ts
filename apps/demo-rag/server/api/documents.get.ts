import { sampleDocuments } from '@mullion/template-rag-sensitive-data';

/**
 * Documents listing endpoint
 *
 * Returns documents accessible by the specified role.
 * Demonstrates access control filtering.
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const role = (query.role as string) || 'public';

    if (!['public', 'internal', 'confidential'].includes(role)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid role. Must be public, internal, or confidential',
      });
    }

    // Get all sample documents
    const allDocuments = sampleDocuments;

    // Define access hierarchy
    const accessHierarchy: Record<string, string[]> = {
      public: ['public'],
      internal: ['public', 'internal'],
      confidential: ['public', 'internal', 'confidential'],
    };

    const allowedLevels = accessHierarchy[role] || ['public'];

    // Filter documents by access level
    const filteredDocuments = allDocuments
      .filter((doc) => allowedLevels.includes(doc.accessLevel))
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        accessLevel: doc.accessLevel,
      }));

    return filteredDocuments;
  } catch (error: unknown) {
    console.error('Documents listing error:', error);

    const errorMessage =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : 'Failed to fetch documents';

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: errorMessage,
    });
  }
});
