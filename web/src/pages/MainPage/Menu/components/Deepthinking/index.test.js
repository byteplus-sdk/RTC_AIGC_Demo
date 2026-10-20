import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import roomReducer, { updateAIConfig } from '@/store/slices/room';
import { THINKING_TYPE } from '@/config/voiceChat/llm';
import { getConfigSnapshot } from '@/config/settings';
import RtcClient from '@/lib/RtcClient';
import Deepthinking from './index';

jest.mock('@byteplus/rtc', () => ({
  StreamIndex: { STREAM_INDEX_MAIN: 0, STREAM_INDEX_SCREEN: 1 },
  NetworkQuality: { UNKNOWN: 0 },
}));
jest.mock('@/lib/RtcClient', () => ({ updateAgent: jest.fn() }));
jest.mock('@arco-design/web-react', () => ({
  Button: ({ children }) => <button>{children}</button>,
  Dropdown: ({ children, droplist }) => (
    <div>
      {children}
      {droplist}
    </div>
  ),
  Menu: Object.assign(({ children }) => <div>{children}</div>, {
    Item: ({ children, onClick, disabled }) => (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
  }),
  Tooltip: ({ children }) => children,
  Message: { error: jest.fn() },
  Modal: { confirm: ({ onOk }) => onOk() },
}));

test('failed deep thinking changes restore the previous setting', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = getConfigSnapshot();
  const store = configureStore({ reducer: { room: roomReducer } });
  store.dispatch(updateAIConfig({ ThinkingType: THINKING_TYPE.DISABLED }));
  RtcClient.updateAgent.mockRejectedValueOnce(new Error('Restart failed'));
  const node = document.createElement('div');
  const root = createRoot(node);
  try {
    act(() =>
      root.render(
        <Provider store={store}>
          <Deepthinking />
        </Provider>
      )
    );
    await act(async () =>
      [...node.querySelectorAll('button')].find((button) => button.textContent === 'Enable').click()
    );
    expect(store.getState().room.aiConfig.ThinkingType).toBe(THINKING_TYPE.DISABLED);
    expect(RtcClient.updateAgent).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    Object.assign(config, previous);
  }
});
