import { vi } from 'vitest';
import '@/config';
import BytePlusRTC from '@byteplus/rtc';
import openAPIs from '@/app/index';
import { checkCallConfiguration } from '@/app/preflight';
import { RtcClient } from './RtcClient';

vi.mock('@byteplus/rtc', () => ({
  default: { destroyEngine: vi.fn() },
  StreamIndex: { STREAM_INDEX_MAIN: 0, STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
vi.mock('@byteplus/rtc/extension-ainr', () => ({ default: vi.fn() }));
vi.mock('@/app/index', () => ({
  default: { StartVoiceChat: vi.fn(), StopVoiceChat: vi.fn() },
}));
vi.mock('@/app/preflight', () => ({ checkCallConfiguration: vi.fn() }));

test('an active call keeps its agent on failed preflight and retries a failed replacement', async () => {
  const client = new RtcClient();
  client.basicInfo = { room_id: 'room', user_id: 'user' };
  client.audioBotEnabled = true;
  const options = { preflight: true, agentExpected: true };
  checkCallConfiguration.mockResolvedValueOnce({ ready: false, issues: [{ message: 'Missing gateway key' }] });
  await expect(client.updateAgent(options)).rejects.toThrow('Missing gateway key');
  expect(openAPIs.StopVoiceChat).not.toHaveBeenCalled();
  expect(openAPIs.StartVoiceChat).not.toHaveBeenCalled();
  expect(client.audioBotEnabled).toBe(true);

  checkCallConfiguration.mockResolvedValue({ ready: true, issues: [] });
  openAPIs.StartVoiceChat.mockRejectedValueOnce(new Error('Start failed'));
  await expect(client.updateAgent(options)).rejects.toThrow('Start failed');
  expect(openAPIs.StopVoiceChat).toHaveBeenCalledTimes(1);
  expect(client.audioBotEnabled).toBe(false);
  await client.updateAgent(options);
  expect(openAPIs.StopVoiceChat).toHaveBeenCalledTimes(1);
  expect(openAPIs.StartVoiceChat).toHaveBeenCalledTimes(2);
  expect(client.audioBotEnabled).toBe(true);
  await client.stopAgent();
});

test('leaving during preflight cancels the agent replacement', async () => {
  const client = new RtcClient();
  client.basicInfo = { room_id: 'room', user_id: 'user' };
  client.audioBotEnabled = true;
  client.engine = { leaveRoom: vi.fn() };
  let finish;
  checkCallConfiguration.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  openAPIs.StartVoiceChat.mockClear();
  const update = client.updateAgent({ preflight: true, agentExpected: true });
  const leaving = client.leaveRoom();
  finish({ ready: true, issues: [] });
  await expect(update).rejects.toThrow();
  await leaving;
  expect(openAPIs.StartVoiceChat).not.toHaveBeenCalled();
});

test('leaving during a replacement start stops the new agent before leaving RTC', async () => {
  const client = new RtcClient();
  client.basicInfo = { room_id: 'room', user_id: 'user' };
  client.engine = { leaveRoom: vi.fn() };
  client.audioBotEnabled = true;
  const starting = Promise.withResolvers();
  const started = Promise.withResolvers();
  openAPIs.StopVoiceChat.mockClear();
  openAPIs.StartVoiceChat.mockImplementationOnce(() => {
    starting.resolve();
    return started.promise;
  });
  checkCallConfiguration.mockResolvedValue({ ready: true, issues: [] });
  const update = client.updateAgent({ preflight: true, agentExpected: true });
  await starting.promise;
  const leaving = client.leaveRoom();
  expect(client.engine.leaveRoom).not.toHaveBeenCalled();
  started.resolve();
  await Promise.all([leaving, update]);
  expect(openAPIs.StopVoiceChat).toHaveBeenCalledTimes(2);
  expect(client.audioBotEnabled).toBe(false);
});

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
