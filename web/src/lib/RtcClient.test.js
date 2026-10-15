import '@/config';
import BytePlusRTC from '@byteplus/rtc';
import { RtcClient } from './RtcClient';

jest.mock('@byteplus/rtc', () => ({
  __esModule: true,
  default: { destroyEngine: jest.fn() },
  NetworkQuality: { UNKNOWN: 0 },
}));
jest.mock('@byteplus/rtc/extension-ainr', () => jest.fn());
jest.mock('@/app/index', () => ({}));

test('pending shutdown releases its original engine', async () => {
  const client = new RtcClient();
  let finishStop;
  client.stopAgent = jest.fn(
    () =>
      new Promise((resolve) => {
        finishStop = resolve;
      })
  );
  const first = { leaveRoom: jest.fn().mockResolvedValue(undefined) };
  const second = { leaveRoom: jest.fn().mockResolvedValue(undefined) };
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
  const engine = { leaveRoom: jest.fn().mockResolvedValue(undefined) };
  client.engine = engine;
  client.stopAgent = jest.fn().mockRejectedValue(new Error('Stop failed'));
  await expect(client.leaveRoom()).rejects.toThrow('Stop failed');
  expect(engine.leaveRoom).toHaveBeenCalledTimes(1);
  expect(BytePlusRTC.destroyEngine).toHaveBeenCalledWith(engine);
});
