import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import roomReducer, { localJoinRoom, updateLocalUser } from '@/store/slices/room';
import RtcClient from '@/lib/RtcClient';
import CameraArea from './CameraArea';

jest.mock('@byteplus/rtc', () => ({
  StreamIndex: { STREAM_INDEX_MAIN: 0, STREAM_INDEX_SCREEN: 1 },
  VideoRenderMode: { RENDER_MODE_FILL: 1, RENDER_MODE_HIDDEN: 2 },
  NetworkQuality: { UNKNOWN: 0 },
}));
jest.mock('@/lib/RtcClient', () => ({
  engine: { setLocalVideoPlayer: jest.fn() },
  setRemoteVideoPlayer: jest.fn(),
}));
jest.mock('@/components/AIAvatarCard', () => () => null);

test('preview binds camera and screen streams to the expanded local player', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const store = configureStore({ reducer: { room: roomReducer } });
  store.dispatch(localJoinRoom({ roomId: 'room', user: { userId: 'user', publishVideo: true } }));
  const node = document.createElement('div');
  const root = createRoot(node);
  try {
    act(() =>
      root.render(
        <Provider store={store}>
          <CameraArea />
        </Provider>
      )
    );
    expect(RtcClient.engine.setLocalVideoPlayer).toHaveBeenLastCalledWith(
      0,
      expect.objectContaining({ renderDom: expect.any(HTMLElement) })
    );
    act(() => node.querySelector('button').click());
    expect(RtcClient.engine.setLocalVideoPlayer).toHaveBeenLastCalledWith(
      0,
      expect.objectContaining({ renderDom: 'local-full-player' })
    );
    act(() => store.dispatch(updateLocalUser({ publishScreen: true, publishVideo: false })));
    expect(RtcClient.engine.setLocalVideoPlayer).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ renderDom: 'local-full-player' })
    );
  } finally {
    act(() => root.unmount());
  }
});
