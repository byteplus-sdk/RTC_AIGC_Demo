import { AIGC_PROXY_HOST } from '@/config';
import { isRealTimeCallMode } from './base';

export interface CallReadiness {
  ready: boolean;
  issues: { stage: string; message: string }[];
}

export async function checkCallConfiguration(
  body: unknown,
  signal?: AbortSignal
): Promise<CallReadiness> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 25000);
  try {
    const action = isRealTimeCallMode() ? 'StartVoiceChatWithRealtimeAPI' : 'StartVoiceChat';
    const response = await fetch(`${AIGC_PROXY_HOST}/preflight?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || typeof result.ready !== 'boolean' || !Array.isArray(result.issues)) {
      throw new Error('Configuration check failed. Check the local service and try again.');
    }
    return result;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
