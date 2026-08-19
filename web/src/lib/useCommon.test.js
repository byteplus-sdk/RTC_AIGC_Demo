import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import BytePlusRTC from '@byteplus/rtc';
import { Modal } from '@arco-design/web-react';
import config from '@/config';
import openAPIs from '@/app/index';
import RtcClient from '@/lib/RtcClient';
import { useJoin, useLeave } from './useCommon';

jest.mock('@byteplus/rtc', () => ({
  __esModule: true,
  default: { isSupported: jest.fn().mockResolvedValue(true) },
  StreamIndex: { STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
jest.mock('@arco-design/web-react', () => ({ Modal: { error: jest.fn() } }));
jest.mock('@/utils/logger', () => ({ debug: jest.fn() }));
jest.mock('@/lib/listenerHooks', () => () => ({}));
jest.mock('@/lib/RtcClient', () => ({}));
jest.mock('@/app/index', () => ({ GenerateRtcAccessToken: jest.fn() }));

let root;
let container;
let previousAppId;
let previousGenerateToken;
let previousFetch;
function Harness() {
  const [joining, join] = useJoin();
  return (
    <button
      type="button"
      onClick={() => join({ username: 'user', roomId: 'room', publishAudio: true }, false)}
    >
      {joining ? 'Connecting' : 'Call now'}
    </button>
  );
}
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  previousAppId = config.AppId;
  previousGenerateToken = openAPIs.GenerateRtcAccessToken;
  config.AppId = 'Your AppId';
  previousFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ Result: { appId: 'test-app' } }),
  });
  Modal.error.mockClear();
  BytePlusRTC.isSupported.mockResolvedValue(true);
  container = document.createElement('div');
  root = createRoot(container);
  const store = configureStore({
    reducer: () => ({
      room: { isAIGCEnable: false },
      device: { devicePermissions: { audio: false } },
    }),
  });
  act(() =>
    root.render(
      <Provider store={store}>
        <Harness />
      </Provider>
    )
  );
});
afterEach(() => {
  act(() => root.unmount());
  config.AppId = previousAppId;
  global.fetch = previousFetch;
  openAPIs.GenerateRtcAccessToken = previousGenerateToken;
});

test('a failed configuration fetch reports the service and allows retry', async () => {
  openAPIs.GenerateRtcAccessToken = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  await act(async () => container.querySelector('button').click());
  expect(Modal.error).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Unable to start conversation',
      content: expect.stringContaining('Start the Node server'),
    })
  );
  expect(container.textContent).toBe('Call now');
  await act(async () => container.querySelector('button').click());
  expect(openAPIs.GenerateRtcAccessToken).toHaveBeenCalledTimes(2);
});

test('repeated clicks share the pending join attempt', async () => {
  let reject;
  openAPIs.GenerateRtcAccessToken = jest.fn().mockImplementation(
    () =>
      new Promise((resolve, fail) => {
        reject = fail;
      })
  );
  await act(async () => {
    container.querySelector('button').click();
    container.querySelector('button').click();
  });
  expect(openAPIs.GenerateRtcAccessToken).toHaveBeenCalledTimes(1);
  expect(container.textContent).toBe('Connecting');
  await act(async () => reject(new TypeError('Failed to fetch')));
  expect(container.textContent).toBe('Call now');
});

function LeaveHarness() {
  const leave = useLeave();
  return (
    <button type="button" onClick={leave}>
      Leave
    </button>
  );
}

test('audio capture failure still releases the RTC session', async () => {
  RtcClient.stopAudioCapture = jest.fn().mockRejectedValue(new Error('Capture stopped'));
  RtcClient.leaveRoom = jest.fn().mockResolvedValue(undefined);
  const store = configureStore({ reducer: () => ({}) });
  act(() =>
    root.render(
      <Provider store={store}>
        <LeaveHarness />
      </Provider>
    )
  );
  await act(async () => container.querySelector('button').click());
  expect(RtcClient.leaveRoom).toHaveBeenCalledTimes(1);
});

test('exit waits for cleanup and coalesces repeated clicks', async () => {
  let finishLeave;
  RtcClient.stopAudioCapture = jest.fn().mockResolvedValue(undefined);
  RtcClient.leaveRoom = jest.fn(
    () =>
      new Promise((resolve) => {
        finishLeave = resolve;
      })
  );
  const actions = [];
  const store = configureStore({
    reducer: () => ({}),
    middleware: (defaults) =>
      defaults().concat(() => (next) => (action) => {
        actions.push(action);
        return next(action);
      }),
  });
  act(() =>
    root.render(
      <Provider store={store}>
        <LeaveHarness />
      </Provider>
    )
  );
  await act(async () => {
    container.querySelector('button').click();
    container.querySelector('button').click();
  });
  expect(RtcClient.leaveRoom).toHaveBeenCalledTimes(1);
  expect(actions).toEqual([]);
  await act(async () => finishLeave());
  expect(actions.map((action) => action.type)).toEqual([
    'room/localLeaveRoom',
    'room/updateAIGCState',
    'room/clearHistoryMsg',
  ]);
});

test('runtime AppId is loaded before token issuance', async () => {
  openAPIs.GenerateRtcAccessToken = jest.fn().mockRejectedValue(new Error('token unavailable'));
  await act(async () => container.querySelector('button').click());
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/runtimeConfig$/));
  expect(openAPIs.GenerateRtcAccessToken).toHaveBeenCalledWith({
    appID: 'test-app',
    roomID: 'room',
    userID: 'user',
  });
});

test('runtime configuration failure releases the join attempt for retry', async () => {
  global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  openAPIs.GenerateRtcAccessToken = jest.fn();
  await act(async () => container.querySelector('button').click());
  expect(container.textContent).toBe('Call now');
  expect(openAPIs.GenerateRtcAccessToken).not.toHaveBeenCalled();
  await act(async () => container.querySelector('button').click());
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
