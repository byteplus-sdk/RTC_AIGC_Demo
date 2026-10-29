import { vi } from 'vitest';
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
import { checkCallConfiguration } from '@/app/preflight';
vi.mock('@/app/preflight', () => ({ checkCallConfiguration: vi.fn() }));

vi.mock('@byteplus/rtc', () => ({
  default: { isSupported: vi.fn().mockResolvedValue(true) },
  StreamIndex: { STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
vi.mock('@arco-design/web-react', () => ({ Modal: { error: vi.fn() } }));
vi.mock('@/utils/logger', () => ({ default: ({ debug: vi.fn() }) }));
vi.mock('@/lib/listenerHooks', () => ({ default: () => ({}) }));
vi.mock('@/lib/RtcClient', () => ({ default: ({}) }));
vi.mock('@/app/index', () => ({ default: ({ GenerateRtcAccessToken: vi.fn() }) }));

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
  checkCallConfiguration.mockResolvedValue({ ready: true, issues: [] });
  previousAppId = config.AppId;
  previousGenerateToken = openAPIs.GenerateRtcAccessToken;
  config.AppId = 'Your AppId';
  previousFetch = global.fetch;
  global.fetch = vi.fn().mockResolvedValue({
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
  openAPIs.GenerateRtcAccessToken = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
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
  openAPIs.GenerateRtcAccessToken = vi.fn().mockImplementation(
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
  RtcClient.stopAudioCapture = vi.fn().mockRejectedValue(new Error('Capture stopped'));
  RtcClient.leaveRoom = vi.fn().mockResolvedValue(undefined);
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
  RtcClient.stopAudioCapture = vi.fn().mockResolvedValue(undefined);
  RtcClient.leaveRoom = vi.fn(
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
    'room/updateFullScreen',
    'room/updateAIGCState',
    'room/clearHistoryMsg',
  ]);
});

test('runtime AppId is loaded before token issuance', async () => {
  openAPIs.GenerateRtcAccessToken = vi.fn().mockRejectedValue(new Error('token unavailable'));
  await act(async () => container.querySelector('button').click());
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/runtimeConfig$/));
  expect(openAPIs.GenerateRtcAccessToken).toHaveBeenCalledWith({
    appID: 'test-app',
    roomID: 'room',
    userID: 'user',
  });
});

test('configured AppId takes precedence over runtime configuration', async () => {
  config.AppId = 'configured-app';
  openAPIs.GenerateRtcAccessToken = vi.fn().mockRejectedValue(new Error('token unavailable'));
  await act(async () => container.querySelector('button').click());
  expect(global.fetch).not.toHaveBeenCalled();
  expect(openAPIs.GenerateRtcAccessToken).toHaveBeenCalledWith(
    expect.objectContaining({ appID: 'configured-app' })
  );
});

test('runtime configuration failure allows retry before token issuance', async () => {
  global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  openAPIs.GenerateRtcAccessToken = vi.fn();
  await act(async () => container.querySelector('button').click());
  expect(container.textContent).toBe('Call now');
  expect(openAPIs.GenerateRtcAccessToken).not.toHaveBeenCalled();
  await act(async () => container.querySelector('button').click());
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test.each([{}, { appId: 123 }, { appId: ' ' }])(
  'invalid runtime AppId is rejected: %p',
  async (result) => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ Result: result }) });
    openAPIs.GenerateRtcAccessToken = vi.fn();
    await act(async () => container.querySelector('button').click());
    expect(openAPIs.GenerateRtcAccessToken).not.toHaveBeenCalled();
    expect(container.textContent).toBe('Call now');
  }
);

test('configuration rejection occurs before token issuance or RTC creation', async () => {
  config.AppId = 'configured-app';
  checkCallConfiguration.mockResolvedValue({
    ready: false,
    issues: [{ stage: 'configuration', message: 'AKOOL_API_KEY is required' }],
  });
  openAPIs.GenerateRtcAccessToken = vi.fn();
  RtcClient.createEngine = vi.fn();
  await act(async () => container.querySelector('button').click());
  expect(openAPIs.GenerateRtcAccessToken).not.toHaveBeenCalled();
  expect(RtcClient.createEngine).not.toHaveBeenCalled();
  expect(Modal.error).toHaveBeenCalledWith(
    expect.objectContaining({ content: 'AKOOL_API_KEY is required' })
  );
});
