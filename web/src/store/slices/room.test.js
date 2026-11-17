import config from '@/config';
import { Provider } from '@/config/basic';
import { getConfigSnapshot } from '@/config/settings';
import reducer, { setHistoryMsg } from './room';

let previous;
beforeEach(() => { previous = getConfigSnapshot(); });
afterEach(() => { Object.assign(config, previous); });

test.each([Provider.Byteplus, Provider.OpenAI, Provider.Google, Provider.AiGateway])(
  'keeps incremental %s reply and its empty terminator in one bubble',
  (provider) => {
    config['Provider.Avatar'] = Provider.None;
    config['Provider.TTS'] = provider;
    config.SeedTtsVersion = '2.0';
    expect(config.subtitleMode).toBe(1);
    let state = reducer(undefined, { type: 'init' });
    for (const [text, paragraph] of [['Hi there!', false], [' Nice to connect.', false], ['', true]]) {
      state = reducer(state, setHistoryMsg({ user: config.BotName, text, definite: true, paragraph }));
    }
    expect(state.msgHistory.map(({ value }) => value)).toEqual(['Hi there! Nice to connect.']);
    expect(state.msgHistory[0].paragraph).toBe(true);
  }
);

test('replaces cumulative subtitles and starts a bubble after a completed sentence', () => {
  config['Provider.Avatar'] = Provider.None;
  config['Provider.TTS'] = Provider.Byteplus;
  config.SeedTtsVersion = '1.0';
  let state = reducer(undefined, { type: 'init' });
  for (const [text, definite, paragraph] of [['Hi', false, false], ['Hi there!', true, false], ['Next sentence.', true, true]]) {
    state = reducer(state, setHistoryMsg({ user: config.BotName, text, definite, paragraph }));
  }
  expect(state.msgHistory.map(({ value }) => value)).toEqual(['Hi there!', 'Next sentence.']);
});

test('preserves an unfinished reply when the user starts speaking', () => {
  let state = reducer(undefined, { type: 'init' });
  state = reducer(state, setHistoryMsg({ user: config.BotName, text: 'Reply', definite: false, paragraph: false }));
  state = reducer(state, setHistoryMsg({ user: 'user', text: 'Hello', definite: false, paragraph: false }));
  expect(state.msgHistory.map(({ value, user }) => [value, user])).toEqual([['Reply', config.BotName], ['Hello', 'user']]);
});

test('clears speaking state when the first welcome subtitle is already complete', () => {
  const state = reducer(
    { ...reducer(undefined, { type: 'init' }), isAITalking: true },
    setHistoryMsg({ user: config.BotName, text: 'Welcome', definite: true, paragraph: true })
  );
  expect(state.isAITalking).toBe(false);
});

test('clears speaking state when a new completed bubble arrives', () => {
  let state = reducer(undefined, { type: 'init' });
  state = reducer(state, setHistoryMsg({ user: 'user', text: 'Hello', paragraph: true }));
  state = reducer(
    { ...state, isAITalking: true },
    setHistoryMsg({ user: config.BotName, text: 'Welcome', definite: true, paragraph: true })
  );
  expect(state.isAITalking).toBe(false);
});
