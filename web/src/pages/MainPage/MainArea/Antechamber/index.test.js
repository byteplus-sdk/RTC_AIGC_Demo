import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import config from '@/config';
import { checkCallConfiguration } from '@/app/preflight';
import { useJoin } from '@/lib/useCommon';
import Antechamber from './index';

jest.mock('@/store/slices/room', () => ({updateFullScreen: payload => ({type:'fullscreen',payload})}));
jest.mock('@/app/preflight', () => ({ checkCallConfiguration: jest.fn() }));
jest.mock('@/lib/useCommon', () => ({ useJoin: jest.fn() }));
jest.mock('@/components/AIChangeCard', () => () => null);
jest.mock('@/config', () => ({
  __esModule: true,
  default: {
    UserId: 'user',
    config: { RoomId: 'room', Config: { LLMConfig: { EndPointId: 'ep-first' } } },
  },
}));
let root, container, store, join;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  join = jest.fn();
  useJoin.mockReturnValue([false, join]);
  checkCallConfiguration.mockReset();
  config.config.Config.LLMConfig.EndPointId = 'ep-first';
  container = document.createElement('div');
  root = createRoot(container);
  store = configureStore({
    reducer: (state = { room: { aiConfig: {}, scene: 'assistant' } }, action) =>
      action.type === 'changed'
        ? { room: { aiConfig: { changed: true }, scene: 'assistant' } }
        : state,
  });
});
afterEach(() => act(() => root.unmount()));
function render() {
  act(() =>
    root.render(
      <Provider store={store}>
        <Antechamber />
      </Provider>
    )
  );
}
test('call stays disabled while checks run and after missing configuration', async () => {
  let finish;
  checkCallConfiguration.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  render();
  expect(container.querySelector('[role="button"]').getAttribute('aria-disabled')).toBe('true');
  await act(async () =>
    finish({
      ready: false,
      issues: [{ stage: 'configuration', message: 'AKOOL_API_KEY is required' }],
    })
  );
  expect(container.textContent).toContain('AKOOL_API_KEY');
  act(() => container.querySelector('[role="button"]').click());
  expect(join).not.toHaveBeenCalled();
});
test('changing settings discards an earlier successful check', async () => {
  const pending = [];
  checkCallConfiguration.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
  render();
  act(() => {
    config.config.Config.LLMConfig.EndPointId = 'ep-new';
    store.dispatch({ type: 'changed' });
  });
  await act(async () => pending[0]({ ready: true, issues: [] }));
  expect(container.querySelector('[role="button"]').getAttribute('aria-disabled')).toBe('true');
  await act(async () => pending[1]({ ready: true, issues: [] }));
  expect(container.querySelector('[role="button"]').getAttribute('aria-disabled')).toBe('false');
  act(() => container.querySelector('[role="button"]').click());
  expect(join).toHaveBeenCalledTimes(1);
});
