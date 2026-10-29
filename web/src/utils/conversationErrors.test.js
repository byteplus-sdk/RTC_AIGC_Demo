import { vi } from 'vitest';
import { createConversationErrorHandler } from './conversationErrors';
test('repeated service errors are grouped per agent generation', () => {
  const notify = vi.fn(),
    stop = vi.fn().mockResolvedValue(undefined),
    engine = {};
  const handle = createConversationErrorHandler(notify, stop);
  handle(engine, 1, 1005005, 'bad handshake');
  handle(engine, 1, 1005005, 'bad handshake');
  expect(notify).toHaveBeenCalledTimes(1);
  handle(engine, 2, 1005005, 'bad handshake');
  expect(notify).toHaveBeenCalledTimes(2);
});
test('ASR retry exhaustion stops once and suppresses late events', async () => {
  const notify = vi.fn(),
    stop = vi.fn().mockResolvedValue(undefined),
    engine = {};
  const handle = createConversationErrorHandler(notify, stop);
  handle(engine, 1, 1003005, 'retry exhausted');
  handle(engine, 1, 1003005, 'retry exhausted');
  handle(engine, 1, 1003006, 'late event');
  expect(stop).toHaveBeenCalledTimes(1);
  expect(notify).toHaveBeenCalledTimes(1);
});
