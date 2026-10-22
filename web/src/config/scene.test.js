import config from '@/config';
import { Provider } from './basic';
import { SCENE, getSceneSettings } from './scene';
import { ModelNames, THINKING_TYPE, isVisionMode, isDeepThinkingMode } from './voiceChat/llm';
import { AKOOL_AVATAR_TYPE } from './voiceChat/avatar';
import { getSettings } from './settings';
import { VoiceChatManager } from './voiceChat';
import { BYTE_PLUS_TTS_2_VOICE_TYPE, BYTE_PLUS_VOICE_TYPE } from './voiceChat/tts';
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
  Object.assign(config, getSceneSettings(SCENE.CUSTOM));
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

test('tutor selects the Alinna avatar and a vision-capable scene', () => {
  const value = getSceneSettings(SCENE.TUTOR);
  expect(value.avatar).toBe(AKOOL_AVATAR_TYPE.Alinna);
  expect(value.VisionEnable).toBe(true);
});

test('deep thinking is included in Ark requests', () => {
  config['Provider.LLM'] = Provider.Byteplus;
  config.Model = ModelNames.Seed21Turbo;
  config.ThinkingType = THINKING_TYPE.ENABLED;
  expect(config.config.Config.LLMConfig.ThinkingType).toBe('enabled');
  config.ThinkingType = THINKING_TYPE.DISABLED;
  expect(config.config.Config.LLMConfig.ThinkingType).toBe('disabled');
  expect(isVisionMode(ModelNames.GPT4o)).toBe(true);
  expect(isDeepThinkingMode(ModelNames.GPT4o)).toBe(false);
});

test('vision input follows the selected media source', () => {
  Object.assign(config, getSceneSettings(SCENE.TUTOR));
  config['Provider.LLM'] = Provider.Byteplus;
  config.CustomMcpList = [];
  config.LLMWebSearchEnabled = false;
  config.VisionSourceType = 0;
  expect(config.config.Config.LLMConfig.VisionConfig.SnapshotConfig.StreamType).toBe(0);
  config.VisionSourceType = 1;
  expect(config.config.Config.LLMConfig.VisionConfig.SnapshotConfig.StreamType).toBe(1);
});

test('Google and custom model selections produce their own request endpoints', () => {
  config['Provider.LLM'] = Provider.Google;
  config.endPointId = 'gemini-2.5-flash';
  expect(config.config.Config.LLMConfig).toMatchObject({
    Mode: 'CustomLLM',
    ModelName: 'gemini-2.5-flash',
    Url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  });
  config['Provider.LLM'] = Provider.CustomLLM;
  config.endPointId = 'test-model';
  config.CustomModelURL = 'https://example.com/chat/completions';
  expect(config.config.Config.LLMConfig).toMatchObject({
    Mode: 'CustomLLM',
    ModelName: 'test-model',
    Url: 'https://example.com/chat/completions',
  });
});

test('agent startup enables conversation state callbacks', () => {
  expect(config.config.AgentConfig.EnableConversationStateCallback).toBe(true);
});

test('Seed TTS uses the BytePlus provider contract', () => {
  config['Provider.TTS'] = Provider.Byteplus;
  expect(config.config.Config.TTSConfig).toMatchObject({
    Provider: 'BytePlus', ProviderParams: { ResourceId: 'seed-tts-2.0' },
  });
});


test.each([Provider.None, Provider.Byteplus, Provider.Akool])(
  'Seed TTS resources and subtitles follow version changes with avatar %s',
  (avatarProvider) => {
    const manager = new VoiceChatManager();
    manager.avatar.provider = avatarProvider;
    for (const [version, voice, resource] of [
      ['2.0', BYTE_PLUS_TTS_2_VOICE_TYPE.Pearl, 'seed-tts-2.0'],
      ['1.0', BYTE_PLUS_VOICE_TYPE.Luna, 'volc.service_type.1000009'],
      ['2.0', BYTE_PLUS_TTS_2_VOICE_TYPE.Vivi, 'seed-tts-2.0'],
    ]) {
      manager.tts.seedTtsVersion = version;
      manager.voice = voice;
      const { Config } = JSON.parse(JSON.stringify(manager.config));
      expect(Config.TTSConfig).toEqual({
        Provider: 'BytePlus',
        ProviderParams: { app: {}, audio: { voice_type: voice }, ResourceId: resource },
      });
      expect(Config.SubtitleConfig.SubtitleMode).toBe(
        avatarProvider !== Provider.None || version === '2.0' ? 1 : 0
      );
    }
  }
);
