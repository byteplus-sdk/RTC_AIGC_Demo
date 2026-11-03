import { vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import { Provider } from '@/config/basic';
import { getConfigSnapshot } from '@/config/settings';
import roomReducer, { localJoinRoom, localLeaveRoom, setHistoryMsg, updateAIGCState, updateAIConfig } from '@/store/slices/room';
import RtcClient from '@/lib/RtcClient';
import AISettings from './index';

vi.mock('@byteplus/rtc', () => ({
  StreamIndex: { STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
vi.mock('@/lib/RtcClient', () => ({ default: ({ updateAgent: vi.fn() }) }));
vi.mock('@arco-design/web-react', () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Drawer: ({ visible, children, footer }) => visible ? <div>{children}{footer}</div> : null,
  Message: { error: vi.fn() },
  Radio: { Group: () => null },
  Tag: ({ children }) => <span>{children}</span>,
  Input: Object.assign(() => null, {
    TextArea: ({ onChange, ...props }) => <textarea {...props} onInput={(event) => onChange(event.target.value)} />,
  }),
}));
vi.mock('../CheckBoxSelector', () => ({ default: ({ label, onChecked, onChange }) => (
  label === 'ASR Vendor' ? <>
    <button onClick={() => onChange('ai_gateway')}>Use gateway ASR</button>
    <button onClick={() => onChange('BytePlus_asr_2.0')}>Use Seed ASR</button>
  </>
    : label === 'LLM Models' ? <button onClick={() => onChecked('openai')}>Use OpenAI</button> : null
) }));
vi.mock('../TitleCard', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../CheckIcon', () => ({ default: () => null }));

test.each([true, false])('provider configuration preserves web search, changed=%s', async (changed) => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = getConfigSnapshot();
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    config.endPointId = 'ep-test';
    config['Provider.LLM'] = Provider.Byteplus;
    config.LLMWebSearchEnabled = true;
    const store = configureStore({ reducer: { room: roomReducer } });
    store.dispatch(updateAIConfig({}));
    RtcClient.updateAgent.mockReset();
    RtcClient.updateAgent.mockRejectedValueOnce(new Error('Restart failed'));
    act(() => root.render(<ReduxProvider store={store}><AISettings /></ReduxProvider>));
    const click = (text) => [...container.querySelectorAll('button')].find((button) => button.textContent === text).click();
    await act(async () => click('Configure'));
    if (changed) await act(async () => click('Use OpenAI'));
    await act(async () => click('Apply'));
    expect(RtcClient.updateAgent).toHaveBeenCalledTimes(changed ? 1 : 0);
    expect(config['Provider.LLM']).toBe(Provider.Byteplus);
    expect(config.LLMWebSearchEnabled).toBe(true);
    expect(store.getState().room.aiConfig.LLMWebSearchEnabled).toBe(true);
  } finally {
    act(() => root.unmount());
    Object.assign(config, previous);
  }
});

test('Apply uses only effective gateway settings and keeps applied settings after leaving', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = getConfigSnapshot();
  const container = document.createElement('div');
  const root = createRoot(container);
  const store = configureStore({ reducer: { room: roomReducer } });
  const click = async (name) => act(async () =>
    [...container.querySelectorAll('button')].find((button) => button.textContent === name).click());
  const setExtraData = async (value) => act(async () => {
    const input = container.querySelector('#gateway-ASR-ExtraData');
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  try {
    config.endPointId = 'ep-test';
    store.dispatch(localJoinRoom({ roomId: 'room', user: { userId: 'user' } }));
    store.dispatch(updateAIConfig({}));
    RtcClient.updateAgent.mockReset();
    act(() => root.render(<ReduxProvider store={store}><AISettings /></ReduxProvider>));
    await click('Configure');
    await click('Use gateway ASR');
    expect([...container.querySelectorAll('label[for^="gateway-ASR-"]')].map((label) => label.htmlFor))
      .toEqual(['gateway-ASR-ExtraData', 'gateway-ASR-ExtraHeader']);
    await setExtraData('{"model":"draft"}');
    await click('Cancel');
    expect(config.aiGateway.ASR).toEqual({});
    await click('Configure');
    await click('Use gateway ASR');
    await setExtraData('invalid json');
    await click('Use Seed ASR');
    act(() => store.dispatch(setHistoryMsg({ user: config.BotName, text: 'keep', paragraph: true, definite: true })));
    await click('Apply');
    expect(RtcClient.updateAgent).not.toHaveBeenCalled();
    expect(store.getState().room.msgHistory.map((msg) => msg.value)).toEqual(['keep']);
    await click('Configure');
    await click('Use gateway ASR');
    for (const invalid of ['invalid json', '[]', 'null', '"text"']) {
      await setExtraData(invalid);
      await click('Apply');
      expect(container.querySelector('[role="alert"]').textContent).toContain('JSON object for ASR ExtraData');
      expect(container.querySelector('#gateway-ASR-ExtraData').getAttribute('aria-invalid')).toBe('true');
      expect(RtcClient.updateAgent).not.toHaveBeenCalled();
    }
    await setExtraData('{"model":"session","__wrapped__":true}');
    act(() => store.dispatch(updateAIGCState({ isAIGCEnable: true })));
    RtcClient.audioBotEnabled = true;
    RtcClient.updateAgent.mockRejectedValueOnce(new Error('Restart failed'));
    await click('Apply');
    expect(config.aiGateway.ASR).toEqual({});
    expect(config['Provider.ASR']).toBe(previous['Provider.ASR']);
    RtcClient.audioBotEnabled = false;
    await click('Use Seed ASR');
    await click('Apply');
    expect(RtcClient.updateAgent).toHaveBeenCalledTimes(2);
    expect(RtcClient.updateAgent).toHaveBeenLastCalledWith({ preflight: true, agentExpected: true });
    RtcClient.audioBotEnabled = true;
    await click('Configure');
    await click('Use gateway ASR');
    await setExtraData('{"model":"session","__wrapped__":true}');
    await click('Apply');
    const extraData = { model: 'session', __wrapped__: true };
    expect(config.config.Config.ASRConfig.ProviderParams).toEqual({ ExtraData: extraData, ExtraHeader: {} });
    act(() => {
      for (const [text, paragraph] of [['one', false], [' two', true]]) {
        store.dispatch(setHistoryMsg({ user: config.BotName, text, paragraph, definite: true }));
      }
    });
    expect(store.getState().room.msgHistory.map((msg) => msg.value)).toEqual(['one two']);
    await click('Configure');
    await setExtraData('{ "__wrapped__": true, "model": "session" }');
    await click('Apply');
    expect(RtcClient.updateAgent).toHaveBeenCalledTimes(3);
    expect(store.getState().room.msgHistory.map((msg) => msg.value)).toEqual(['one two']);
    act(() => store.dispatch(localLeaveRoom()));
    expect(store.getState().room.aiConfig['Provider.ASR']).toBe(Provider.AiGateway);
    expect(config.config.Config.ASRConfig.ProviderParams.ExtraData).toEqual(extraData);
  } finally {
    RtcClient.audioBotEnabled = false;
    act(() => root.unmount());
    Object.assign(config, previous);
  }
});
