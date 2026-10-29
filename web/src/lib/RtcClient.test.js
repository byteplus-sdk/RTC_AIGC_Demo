import { vi } from 'vitest';
import '@/config';
import BytePlusRTC from '@byteplus/rtc';
import { RtcClient } from './RtcClient';

vi.mock('@byteplus/rtc', () => ({
  default: { destroyEngine: vi.fn() },
  StreamIndex: { STREAM_INDEX_MAIN: 0, STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
vi.mock('@byteplus/rtc/extension-ainr', () => ({ default: vi.fn() }));
vi.mock('@/app/index', () => ({ default: ({}) }));

test('pending shutdown releases its original engine', async () => {
  const client = new RtcClient();
  let finishStop;
  client.stopAgent = vi.fn(
    () =>
      new Promise((resolve) => {
        finishStop = resolve;
      })
  );
  const first = { leaveRoom: vi.fn().mockResolvedValue(undefined) };
  const second = { leaveRoom: vi.fn().mockResolvedValue(undefined) };
  client.engine = first;
  const leaving = client.leaveRoom();
  client.engine = second;
  finishStop();
  await leaving;
  expect(first.leaveRoom).toHaveBeenCalledTimes(1);
  expect(second.leaveRoom).not.toHaveBeenCalled();
  expect(BytePlusRTC.destroyEngine).toHaveBeenCalledWith(first);
});

test('agent shutdown failure still destroys the captured engine', async () => {
  const client = new RtcClient();
  const engine = { leaveRoom: vi.fn().mockResolvedValue(undefined) };
  client.engine = engine;
  client.stopAgent = vi.fn().mockRejectedValue(new Error('Stop failed'));
  await expect(client.leaveRoom()).rejects.toThrow('Stop failed');
  expect(engine.leaveRoom).toHaveBeenCalledTimes(1);
  expect(BytePlusRTC.destroyEngine).toHaveBeenCalledWith(engine);
});
