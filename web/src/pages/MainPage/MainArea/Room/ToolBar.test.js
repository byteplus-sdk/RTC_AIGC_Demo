import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import roomReducer, { updateAIConfig } from '@/store/slices/room';
import RtcClient from '@/lib/RtcClient';
import ToolBar from './ToolBar';

jest.mock('@byteplus/rtc', () => ({
  __esModule: true,
  default: { events: { onTrackEnded: 'track-ended' } },
  MediaType: { VIDEO: 2 },
  StreamIndex: { STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
jest.mock('@/lib/RtcClient', () => ({
  engine: {
    on: jest.fn(),
    off: jest.fn(),
    startScreenCapture: jest.fn(),
    stopScreenCapture: jest.fn(),
    publishScreen: jest.fn(),
    unpublishScreen: jest.fn(),
  },
}));
jest.mock('@/lib/useCommon', () => ({
  useDeviceState: () => ({ isAudioPublished: true, switchMic: jest.fn() }),
  useLeave: () => jest.fn(),
}));
jest.mock('../../Menu', () => () => null);

let container;
let root;
let previousVision;
let previousEngine;
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
  const store = configureStore({ reducer: { room: roomReducer } });
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
      () => new Promise((resolve, reject) => {
        completeCapture = outcome === 'resolve' ? resolve : () => reject(new Error('Cancelled'));
      })
    );
    await act(async () => container.querySelector('[aria-label="Share screen"]').click());
    act(() => root.render(null));
    const newEngine = {
      publishScreen: jest.fn(),
      stopScreenCapture: jest.fn(),
      off: jest.fn(),
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
