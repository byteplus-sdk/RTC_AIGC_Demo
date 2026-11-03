import { vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import { Provider } from '@/config/basic';
import { getConfigSnapshot } from '@/config/settings';
import roomReducer, { localJoinRoom, setHistoryMsg, updateAIConfig, updateIsShowSubtitle } from '@/store/slices/room';
import Conversation from './Conversation';

vi.mock('@byteplus/rtc', () => ({
  StreamIndex: { STREAM_INDEX_MAIN: 0, STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));

test('gateway ASR and Amazon TTS display both speakers when subtitles are enabled', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = getConfigSnapshot();
  const store = configureStore({ reducer: { room: roomReducer } });
  const node = document.createElement('div');
  const root = createRoot(node);
  try {
    store.dispatch(updateAIConfig({ 'Provider.ASR': Provider.AiGateway, 'Provider.TTS': Provider.Amazon }));
    store.dispatch(localJoinRoom({ roomId: 'room', user: { userId: 'user' } }));
    store.dispatch(setHistoryMsg({ user: 'user', text: 'User transcript', paragraph: true }));
    store.dispatch(setHistoryMsg({ user: config.BotName, text: 'Agent reply', paragraph: true }));
    act(() => root.render(<ReduxProvider store={store}><Conversation /></ReduxProvider>));
    expect(node.textContent).toContain('User transcript');
    expect(node.textContent).toContain('Agent reply');
    act(() => store.dispatch(updateIsShowSubtitle(false)));
    expect(node.textContent).not.toContain('User transcript');
    expect(node.textContent).not.toContain('Agent reply');
  } finally {
    act(() => root.unmount());
    Object.assign(config, previous);
  }
});
