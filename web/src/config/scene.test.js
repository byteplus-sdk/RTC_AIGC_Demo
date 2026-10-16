import config from '@/config';
import { Provider } from './basic';
import { SCENE, getSceneSettings } from './scene';
import { getSettings } from './settings';
import reducer, { updateAIConfig } from '@/store/slices/room';

jest.mock('@byteplus/rtc', () => ({
  StreamIndex: { STREAM_INDEX_SCREEN: 1, STREAM_INDEX_MAIN: 0 },
  NetworkQuality: { UNKNOWN: 0 },
}));

const originalMode = process.env.REACT_APP_MODE;
let previous;
beforeEach(() => {
  process.env.REACT_APP_MODE = 'flexible';
  previous = {
    ...getSettings(),
    LLMWebSearchEnabled: config.LLMWebSearchEnabled,
    CustomMcpList: config.CustomMcpList,
    interruptMode: config.interruptMode,
  };
});
afterEach(() => {
  Object.assign(config, previous);
  process.env.REACT_APP_MODE = originalMode;
});

test('scene selection keeps the configured model endpoint', () => {
  config.endPointId = 'ep-user-configured';
  Object.assign(config, getSceneSettings(SCENE.TEACHING_ASSISTANT));
  expect(config.endPointId).toBe('ep-user-configured');
  expect(config.config.Config.LLMConfig).toMatchObject({ EndPointId: 'ep-user-configured' });
});

test('language scenes update the Google recognition request', () => {
  Object.assign(config, getSceneSettings(SCENE.JAPANESE));
  expect(config.config.Config.ASRConfig).toMatchObject({
    Provider: 'GoogleV2',
    ProviderParams: { LanguageCodes: ['ja-JP'] },
  });
  config['Provider.ASR'] = Provider.Amazon;
  expect(config.config.Config.ASRConfig).toMatchObject({ ProviderParams: { Language: 'ja-JP' } });
  config['Provider.ASR'] = Provider.GoogleAsrV1;
  expect(config.config.Config.ASRConfig).toMatchObject({
    Provider: 'Google',
    ProviderParams: { Language: 'ja-JP' },
  });
});

test('screen recognition follows the scene and web search state', () => {
  Object.assign(config, getSceneSettings(SCENE.SCREEN_READER));
  config['Provider.LLM'] = Provider.Byteplus;
  config.LLMWebSearchEnabled = false;
  config.CustomMcpList = [];
  expect(config.config.Config.LLMConfig).toMatchObject({
    VisionConfig: { Enable: true, SnapshotConfig: { StreamType: 1 } },
  });
  config.LLMWebSearchEnabled = true;
  expect(config.config.Config.LLMConfig).toMatchObject({ VisionConfig: { Enable: false } });
  config.LLMWebSearchEnabled = false;
  config.CustomMcpList = [{ Name: 'test', URL: 'https://example.com/mcp' }];
  expect(config.config.Config.LLMConfig).toMatchObject({ VisionConfig: { Enable: false } });
});

test('voice interruption maps to the VoiceChat request', () => {
  config.interruptMode = false;
  expect(config.config.Config.InterruptMode).toBe(1);
  config.interruptMode = true;
  expect(config.config.Config.InterruptMode).toBe(0);
});

test('leaving the screen scene disables cached vision configuration', () => {
  Object.assign(config, getSceneSettings(SCENE.SCREEN_READER));
  config.config;
  Object.assign(config, getSceneSettings(SCENE.TEACHING_ASSISTANT));
  expect(config.config.Config.LLMConfig.VisionConfig.Enable).toBe(false);
});

test('configuration changes publish a new Redux snapshot', () => {
  const previousState = reducer(undefined, { type: 'init' });
  const oldVoice = previousState.aiConfig.voice;
  const nextState = reducer(previousState, updateAIConfig({ voice: 'test-voice' }));
  expect(nextState).not.toBe(previousState);
  expect(nextState.aiConfig.voice).toBe('test-voice');
  expect(previousState.aiConfig.voice).toBe(oldVoice);
  expect(config.voice).toBe('test-voice');
});

test('custom character clears preset prompts and restores base capabilities', () => {
  Object.assign(config, getSceneSettings(SCENE.TUTOR));
  Object.assign(config, getSceneSettings(SCENE.CUSTOM));
  expect(config.SystemMessages).toEqual(['']);
  expect(config.WelcomeMessage).toBe('');
  expect(config['Provider.Avatar']).toBe(Provider.None);
  expect(config.avatar).toBe('');
  expect(config.voice).toBe(getSceneSettings(SCENE.TEACHING_ASSISTANT).voice);
  Object.assign(config, getSceneSettings(SCENE.SCREEN_READER));
  Object.assign(config, getSceneSettings(SCENE.CUSTOM));
  expect(config.VisionEnable).toBe(false);
});
