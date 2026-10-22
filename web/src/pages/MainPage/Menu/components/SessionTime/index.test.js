import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SessionTime, { SESSION_DURATION } from './index';
import { useLeave } from '@/lib/useCommon';

jest.mock('@/lib/useCommon', () => ({ useLeave: jest.fn() }));

test('session countdown expires once and resets for a new room', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  const leave = jest.fn();
  useLeave.mockReturnValue(leave);
  const store = configureStore({
    reducer: (state = { room: { isJoined: true, roomId: 'one', sessionStartedAt: Date.now() } }, action) =>
      action.type === 'next-room' ? { room: { isJoined: true, roomId: 'two', sessionStartedAt: Date.now() } } : state,
  });
  const element = document.createElement('div');
  const root = createRoot(element);
  try {
    act(() =>
      root.render(
        <Provider store={store}>
          <SessionTime /><SessionTime enforce />
        </Provider>
      )
    );
    expect(element.textContent).toContain('30:00');
    act(() => jest.advanceTimersByTime(1000));
    expect(element.textContent).toContain('29:59');
    act(() => jest.advanceTimersByTime(SESSION_DURATION * 1000));
    expect(element.textContent).toContain('00:00');
    expect(leave).toHaveBeenCalledTimes(1);
    act(() => store.dispatch({ type: 'next-room' }));
    expect(element.textContent).toContain('30:00');
  } finally {
    act(() => root.unmount());
    jest.useRealTimers();
  }
});


test('late display uses the room deadline while enforcement survives display unmount', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  const leave = jest.fn();
  useLeave.mockReturnValue(leave);
  const started = Date.now();
  const store = configureStore({
    reducer: (state = { room: { isJoined: true, roomId: 'one', sessionStartedAt: started } }) => state,
  });
  const element = document.createElement('div');
  const root = createRoot(element);
  let mounted = true;
  try {
    const render = (show) => act(() => root.render(
      <Provider store={store}>
        <SessionTime enforce />
        {show && <SessionTime />}
      </Provider>
    ));
    render(false);
    act(() => jest.advanceTimersByTime(10 * 60 * 1000));
    render(true);
    expect(element.textContent).toContain('20:00');
    expect(leave).not.toHaveBeenCalled();
    render(false);
    expect(jest.getTimerCount()).toBe(1);
    act(() => jest.advanceTimersByTime(SESSION_DURATION * 1000));
    expect(leave).toHaveBeenCalledTimes(1);
    render(true);
    expect(element.textContent).toContain('00:00');
    expect(leave).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    mounted = false;
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(1000));
    expect(leave).toHaveBeenCalledTimes(1);
  } finally {
    if (mounted) act(() => root.unmount());
    jest.useRealTimers();
  }
});
