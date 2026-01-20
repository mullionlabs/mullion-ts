/**
 * API Status Endpoint
 *
 * GET /api/status
 *
 * Returns information about the current API configuration.
 */

import {defineEventHandler} from 'h3';

export default defineEventHandler((event) => {
  return {
    mockMode: isMockMode(event),
    provider: getProviderName(event),
  };
});
