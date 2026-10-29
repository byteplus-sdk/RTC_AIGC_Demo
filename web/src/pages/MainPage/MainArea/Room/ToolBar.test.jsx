import { vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import roomReducer, { updateAIConfig, updateLocalUser, updateScene } from '@/store/slices/room';
import { getSceneSettings, SCENE } from '@/config/scene';
import RtcClient from '@/lib/RtcClient';
import ToolBar from './ToolBar';

vi.mock('@byteplus/rtc', () => ({
  default: { events: { onTrackEnded: 'track-ended' } },
  MediaType: { VIDEO: 2 },
  StreamIndex: { STREAM_INDEX_MAIN: 0, STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
vi.mock('@/lib/RtcClient', () => ({ default: ({
  engine: {
    on: vi.fn(),
    off: vi.fn(),
    startScreenCapture: vi.fn(),
    stopScreenCapture: vi.fn(),
    startVideoCapture: vi.fn(),
    stopVideoCapture: vi.fn(),
    publishStream: vi.fn(),
    unpublishStream: vi.fn(),
    publishScreen: vi.fn(),
    unpublishScreen: vi.fn(),
  },
}) }));
vi.mock('@/lib/useCommon', () => ({
  useDeviceState: () => ({ isAudioPublished: true, switchMic: vi.fn() }),
  useLeave: () => vi.fn(),
}));
vi.mock('../../Menu', () => ({ default: () => null }));

let container;
let root;
let previousVision;
let previousEngine;
let store;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  previousEngine = RtcClient.engine;
  previousVision = config.VisionEnable;
  config.LLMWebSearchEnabled = false;
  config.CustomMcpList = [];
  Object.values(RtcClient.engine).forEach((mock) => mock.mockReset().mockResolvedValue(undefined));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  store = configureStore({ reducer: { room: roomReducer } });
  store.dispatch(updateAIConfig({ VisionEnable: true }));
  act(() =>
    root.render(
      <Provider store={store}>
        <ToolBar />
      </Provider>
    )
  );
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  config.VisionEnable = previousVision;
  RtcClient.engine = previousEngine;
});

test('screen sharing releases the published stream when stopped', async () => {
  await act(async () => container.querySelector('[aria-label="Share screen"]').click());
  expect(RtcClient.engine.startScreenCapture).toHaveBeenCalledWith({ enableAudio: false });
  expect(RtcClient.engine.publishScreen).toHaveBeenCalledWith(2);
  await act(async () => container.querySelector('[aria-label="Stop sharing screen"]').click());
  expect(RtcClient.engine.unpublishScreen).toHaveBeenCalledWith(2);
  expect(RtcClient.engine.stopScreenCapture).toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Share screen"]')).not.toBeNull();
});

test('failed screen publication stops capture and permits another attempt', async () => {
  RtcClient.engine.publishScreen.mockRejectedValueOnce(new Error('Publication failed'));
  await act(async () => container.querySelector('[aria-label="Share screen"]').click());
  expect(RtcClient.engine.stopScreenCapture).toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Share screen"]').disabled).toBe(false);
});

for (const outcome of ['resolve', 'reject']) {
  test(`pending screen capture ${outcome} keeps the retiring engine isolated`, async () => {
    const retiringEngine = RtcClient.engine;
    let completeCapture;
    retiringEngine.startScreenCapture.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          completeCapture = outcome === 'resolve' ? resolve : () => reject(new Error('Cancelled'));
        })
    );
    await act(async () => container.querySelector('[aria-label="Share screen"]').click());
    act(() => root.render(null));
    const newEngine = {
      publishScreen: vi.fn(),
      stopScreenCapture: vi.fn(),
      off: vi.fn(),
    };
    RtcClient.engine = newEngine;
    await act(async () => completeCapture());
    expect(retiringEngine.publishScreen).not.toHaveBeenCalled();
    expect(retiringEngine.stopScreenCapture).toHaveBeenCalled();
    expect(retiringEngine.off).toHaveBeenCalled();
    expect(newEngine.publishScreen).not.toHaveBeenCalled();
    expect(newEngine.stopScreenCapture).not.toHaveBeenCalled();
    expect(newEngine.off).not.toHaveBeenCalled();
  });
}

test('camera capture publishes and releases the main video stream', async () => {
  await act(async () => container.querySelector('[aria-label="Turn on camera"]').click());
  expect(RtcClient.engine.startVideoCapture).toHaveBeenCalledTimes(1);
  expect(RtcClient.engine.publishStream).toHaveBeenCalledWith(2);
  await act(async () => container.querySelector('[aria-label="Turn off camera"]').click());
  expect(RtcClient.engine.unpublishStream).toHaveBeenCalledWith(2);
  expect(RtcClient.engine.stopVideoCapture).toHaveBeenCalled();
});

test('switching from camera to screen stops the camera first', async () => {
  await act(async () => container.querySelector('[aria-label="Turn on camera"]').click());
  await act(async () => container.querySelector('[aria-label="Share screen"]').click());
  expect(RtcClient.engine.stopVideoCapture).toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Turn on camera"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="Stop sharing screen"]')).not.toBeNull();
});

test('pending camera acquisition stays attached to its originating engine', async () => {
  const engine = RtcClient.engine;
  let complete;
  engine.startVideoCapture.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      })
  );
  await act(async () => container.querySelector('[aria-label="Turn on camera"]').click());
  act(() => root.render(null));
  RtcClient.engine = { publishStream: vi.fn(), stopVideoCapture: vi.fn() };
  await act(async () => complete());
  expect(engine.publishStream).not.toHaveBeenCalled();
  expect(engine.stopVideoCapture).toHaveBeenCalled();
  expect(RtcClient.engine.publishStream).not.toHaveBeenCalled();
  expect(RtcClient.engine.stopVideoCapture).not.toHaveBeenCalled();
});


test('switching to the screen reader scene releases the camera', async () => {
  await act(async () => container.querySelector('[aria-label="Turn on camera"]').click());
  await act(async () => {
    store.dispatch(updateAIConfig(getSceneSettings(SCENE.SCREEN_READER)));
    store.dispatch(updateScene(SCENE.SCREEN_READER));
  });
  expect(RtcClient.engine.unpublishStream).toHaveBeenCalledWith(2);
  expect(RtcClient.engine.stopVideoCapture).toHaveBeenCalledTimes(1);
  expect(store.getState().room.localUser.publishVideo).toBe(false);
  expect(container.querySelector('[aria-label="Turn on camera"]')).toBeNull();
  expect(container.querySelector('[aria-label="Turn off camera"]')).toBeNull();
  expect(container.querySelector('[aria-label="Share screen"]')).not.toBeNull();
});

test('pending camera unpublication cannot change a replacement session', async () => {
  const engine = RtcClient.engine;
  await act(async () => container.querySelector('[aria-label="Turn on camera"]').click());
  let finishUnpublish;
  engine.unpublishStream.mockImplementationOnce(
    () => new Promise((resolve) => { finishUnpublish = resolve; })
  );
  await act(async () => container.querySelector('[aria-label="Share screen"]').click());
  act(() => root.render(null));
  RtcClient.engine = {
    startScreenCapture: vi.fn(),
    publishScreen: vi.fn(),
    stopVideoCapture: vi.fn(),
  };
  store.dispatch(updateLocalUser({ userId: 'replacement-user', publishVideo: true }));
  const replacementUser = store.getState().room.localUser;
  await act(async () => finishUnpublish());
  expect(engine.stopVideoCapture).not.toHaveBeenCalled();
  expect(engine.startScreenCapture).not.toHaveBeenCalled();
  expect(RtcClient.engine.startScreenCapture).not.toHaveBeenCalled();
  expect(RtcClient.engine.publishScreen).not.toHaveBeenCalled();
  expect(RtcClient.engine.stopVideoCapture).not.toHaveBeenCalled();
  expect(store.getState().room.localUser).toBe(replacementUser);
});
