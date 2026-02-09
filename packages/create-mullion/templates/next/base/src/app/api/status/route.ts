import {getProviderName, isMockMode} from '@/mullion/provider';

export async function GET() {
  return Response.json({
    mockMode: isMockMode(),
    provider: getProviderName(),
  });
}
