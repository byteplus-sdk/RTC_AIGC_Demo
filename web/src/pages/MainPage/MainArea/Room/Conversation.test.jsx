import { vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import { Provider } from '@/config/basic';
import { getConfigSnapshot } from '@/config/settings';
import roomReducer, { localJoinRoom, setHistoryMsg, updateAIConfig, updateIsShowSubtitle, updateAITalkState, remoteUserJoin } from '@/store/slices/room';
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
    store.dispatch(setHistoryMsg({ user: 'user', text: '**User transcript**', paragraph: true }));
    store.dispatch(setHistoryMsg({ user: config.BotName, text: '### Agent reply\n\n1. **First**\n2. Second\n\n> A quote', paragraph: true }));
    act(() => root.render(<ReduxProvider store={store}><Conversation /></ReduxProvider>));
    expect(node.textContent).toContain('**User transcript**');
    expect(node.querySelector('h3')?.textContent).toBe('Agent reply');
    expect(node.querySelector('ol li strong')?.textContent).toBe('First');
    expect(node.querySelector('blockquote')?.textContent).toContain('A quote');
    act(() => store.dispatch(updateIsShowSubtitle(false)));
    expect(node.textContent).not.toContain('User transcript');
    expect(node.textContent).not.toContain('Agent reply');
  } finally {
    act(() => root.unmount());
    Object.assign(config, previous);
  }
});


test('flattened headings start new lines in streaming AI subtitles', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = getConfigSnapshot();
  const store = configureStore({ reducer: { room: roomReducer } });
  const node = document.createElement('div');
  const root = createRoot(node);
  try {
    store.dispatch(updateAIConfig({ 'Provider.TTS': Provider.OpenAI }));
    const append = (text, paragraph) =>
      store.dispatch(setHistoryMsg({ user: config.BotName, text, paragraph }));
    append('如下： ##', false);
    act(() => root.render(<ReduxProvider store={store}><Conversation /></ReduxProvider>));
    act(() => append('# 📌 核心对话内容，示例 `### literal` 等### 🛠️ 顶部状态提示', true));
    const paragraph = node.querySelector('p');
    expect(paragraph.textContent).toBe('如下：\n📌 核心对话内容，示例 ### literal 等\n🛠️ 顶部状态提示');
    expect(paragraph.querySelector('code')?.textContent).toBe('### literal');
  } finally {
    act(() => root.unmount());
    Object.assign(config, previous);
  }
});

test('reply markup preserves literal examples and opens references in another tab', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = getConfigSnapshot();
  const store = configureStore({ reducer: { room: roomReducer } });
  const node = document.createElement('div');
  const root = createRoot(node);
  try {
    store.dispatch(updateAIConfig({ 'Provider.TTS': Provider.Byteplus }));
    const text = 'Use <button>, type \\### literally, or read [setup](https://example.com/setup).';
    store.dispatch(setHistoryMsg({ user: config.BotName, text, paragraph: true }));
    act(() => root.render(<ReduxProvider store={store}><Conversation /></ReduxProvider>));
    const paragraph = node.querySelector('p');
    expect(paragraph.textContent).toBe('Use <button>, type ### literally, or read setup.');
    expect(paragraph.querySelector('button')).toBeNull();
    expect(paragraph.querySelector('a')?.target).toBe('_blank');
    expect(paragraph.querySelector('a')?.rel).toContain('noopener');
  } finally {
    act(() => root.unmount());
    Object.assign(config, previous);
  }
});

test.each([true, false])('welcome subtitle loading follows paragraph completion: %s', (paragraph) => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = getConfigSnapshot();
  const store = configureStore({ reducer: { room: roomReducer } });
  const node = document.createElement('div');
  const root = createRoot(node);
  try {
    store.dispatch(updateAIConfig({ 'Provider.TTS': Provider.Byteplus }));
    store.dispatch(remoteUserJoin({ userId: config.BotName }));
    store.dispatch(setHistoryMsg({ user: config.BotName, text: 'Welcome', paragraph, definite: true }));
    store.dispatch(updateAITalkState({ isAITalking: true }));
    act(() => root.render(<ReduxProvider store={store}><Conversation /></ReduxProvider>));
    expect(node.textContent).toContain('Welcome');
    expect(Boolean(node.querySelector('[class*="loader"]'))).toBe(!paragraph);
  } finally {
    act(() => root.unmount());
    Object.assign(config, previous);
  }
});
