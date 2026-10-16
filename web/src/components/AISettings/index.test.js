import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import { Provider } from '@/config/basic';
import { getConfigSnapshot } from '@/config/settings';
import roomReducer, { updateAIConfig } from '@/store/slices/room';
import RtcClient from '@/lib/RtcClient';
import AISettings from './index';

jest.mock('@byteplus/rtc', () => ({
  StreamIndex: { STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
jest.mock('@/lib/RtcClient', () => ({ updateAgent: jest.fn() }));
jest.mock('@arco-design/web-react', () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Drawer: ({ visible, children, footer }) => visible ? <div>{children}{footer}</div> : null,
  Message: { error: jest.fn() },
  Radio: { Group: () => null },
  Tag: ({ children }) => <span>{children}</span>,
  Input: Object.assign(() => null, { TextArea: () => null }),
}));
jest.mock('../CheckBoxSelector', () => ({ label, onChecked }) => (
  label === 'LLM Models' ? <button onClick={() => onChecked('openai')}>Use OpenAI</button> : null
));
jest.mock('../TitleCard', () => ({ children }) => <div>{children}</div>);
jest.mock('../CheckIcon', () => () => null);

test.each([true, false])('provider configuration preserves web search, changed=%s', async (changed) => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = getConfigSnapshot();
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
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
