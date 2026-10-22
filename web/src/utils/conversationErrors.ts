export function createConversationErrorHandler(
  notify: (message: string) => void,
  stop: () => Promise<void>
) {
  let session: unknown;
  let generation: number | undefined;
  let stopped = false;
  const seen = new Set<number>();
  return (
    currentSession: unknown,
    currentGeneration: number | undefined,
    code: number,
    reason: string
  ) => {
    if (session !== currentSession || generation !== currentGeneration) {
      session = currentSession;
      generation = currentGeneration;
      stopped = false;
      seen.clear();
    }
    if (stopped || seen.has(code)) return;
    seen.add(code);
    notify(`VoiceChat ${code}: ${reason}`);
    if (code === 1003005) {
      stopped = true;
      void stop().catch(() => {});
    }
  };
}
