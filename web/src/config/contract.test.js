import { vi } from 'vitest';
import './index';
import { ConfigFactory } from './config';
import { Provider } from './basic';
import { ASRManager } from './voiceChat/asr';
import { AvatarMap, RealtimeAvatarMap } from './voiceChat/avatar';
import { SCENE, getSceneSettings } from './scene';

vi.mock('@byteplus/rtc', () => ({
  StreamIndex: { STREAM_INDEX_SCREEN: 1, STREAM_INDEX_MAIN: 0 },
  NetworkQuality: { UNKNOWN: 0 },
}));

const originalMode = import.meta.env.REACT_APP_MODE;
afterEach(() => { vi.stubEnv('REACT_APP_MODE', originalMode); });

function keys(value, allowed, required = []) {
  expect(Object.keys(value).filter((key) => !allowed.includes(key))).toEqual([]);
  for (const key of required) expect(value).toHaveProperty(key);
}

const asrFields = {
  Amazon: ['ID', 'Secret', 'Region', 'Language'],
  BytePlus: ['Mode', 'Language', 'AppId', 'AccessToken', 'ApiResourceId', 'StreamMode', 'enable_nonstream'],
  Google: ['Language', 'Model', 'CredentialsJSON'],
  GoogleV2: ['LanguageCodes', 'Model', 'CredentialsJSON', 'RecognizerPath'],
};
const ttsFields = {
  BytePlus: ['app', 'audio', 'ResourceId'],
  Amazon: ['ID', 'Secret', 'VoiceID', 'Region', 'Language'],
  OpenAI: ['URL', 'APIKey', 'Model', 'Voice', 'Speed'],
  Google: ['VoiceSelection', 'StreamingAudioConfig', 'CredentialsJSON'],
};

function flexible(body) {
  keys(body, ['AppId', 'RoomId', 'TaskId', 'AgentConfig', 'Config'], ['AppId', 'RoomId', 'TaskId', 'AgentConfig', 'Config']);
  keys(body.AgentConfig, ['TargetUserID', 'UserID', 'WelcomeMessage', 'EnableConversationStateCallback'], ['TargetUserID', 'UserID']);
  const c = body.Config;
  keys(c, ['ASRConfig', 'LLMConfig', 'TTSConfig', 'AvatarConfig', 'SubtitleConfig', 'InterruptMode', 'WebSearchAgentConfig']);
  keys(c.ASRConfig, ['Provider', 'ProviderParams'], ['Provider', 'ProviderParams']);
  expect(Object.keys(asrFields)).toContain(c.ASRConfig.Provider);
  keys(c.ASRConfig.ProviderParams, asrFields[c.ASRConfig.Provider]);
  keys(c.TTSConfig, ['Provider', 'ProviderParams', 'IgnoreBracketText'], ['Provider', 'ProviderParams']);
  expect(Object.keys(ttsFields)).toContain(c.TTSConfig.Provider);
  const t = c.TTSConfig.ProviderParams;
  keys(t, ttsFields[c.TTSConfig.Provider]);
  if (c.TTSConfig.Provider === 'BytePlus') {
    keys(t, ttsFields.BytePlus, ['app', 'audio', 'ResourceId']);
    keys(t.app, ['appid', 'token']);
    keys(t.audio, ['voice_type', 'speech_rate', 'pitch_rate'], ['voice_type']);
    expect(['seed-tts-2.0', 'volc.service_type.1000009']).toContain(t.ResourceId);
  }
  if (c.TTSConfig.Provider === 'Google') {
    keys(t.VoiceSelection, ['LanguageCode', 'Name'], ['LanguageCode', 'Name']);
    keys(t.StreamingAudioConfig, ['SpeakingRate']);
  }
  const l = c.LLMConfig;
  keys(l, ['Provider', 'Mode', 'EndPointId', 'Url', 'APIKey', 'ModelName', 'SystemMessages', 'UserPrompts', 'VisionConfig', 'ThinkingType', 'MCP']);
  if (l.Provider === 'BytePlus') {
    keys(l, ['Provider', 'EndPointId', 'APIKey', 'SystemMessages', 'VisionConfig', 'ThinkingType', 'MCP'], ['Provider', 'EndPointId']);
  } else if (l.Provider === 'OpenAI') {
    expect(l.Url).toBe('https://api.openai.com/v1/chat/completions');
    expect(l.Mode).toBeUndefined();
    expect(l).toHaveProperty('ModelName');
  } else {
    expect(l.Mode).toBe('CustomLLM');
    expect(l).toHaveProperty('Url');
    expect(l).toHaveProperty('ModelName');
  }
  keys(l.VisionConfig, ['Enable', 'SnapshotConfig']);
  keys(l.VisionConfig.SnapshotConfig, ['StreamType', 'Height', 'Interval', 'ImagesLimit']);
  expect([0, 1]).toContain(l.VisionConfig.SnapshotConfig.StreamType);
  expect(l.VisionConfig.SnapshotConfig.Interval).toBeGreaterThanOrEqual(100);
  expect(l.VisionConfig.SnapshotConfig.Interval).toBeLessThanOrEqual(5000);
  keys(c.SubtitleConfig, ['SubtitleMode']);
  expect([0, 1]).toContain(c.SubtitleConfig.SubtitleMode);
  expect([0, 1, 2]).toContain(c.InterruptMode);
  keys(c.AvatarConfig, ['Enabled', 'Provider', 'ProviderParams', 'AvatarUserID']);
  if (c.AvatarConfig.Enabled) {
    expect(c.AvatarConfig.Provider).toBe('Akool');
    keys(c.AvatarConfig.ProviderParams, ['ApiKey', 'AvatarId'], ['AvatarId']);
    expect(c.AvatarConfig.AvatarUserID).not.toBe(body.AgentConfig.UserID);
    expect(body.AgentConfig.TargetUserID).not.toContain(c.AvatarConfig.AvatarUserID);
  }
  if (c.WebSearchAgentConfig) {
    keys(c.WebSearchAgentConfig, ['Enable', 'APIKey', 'ParamsString', 'FunctionName', 'FunctionDescription', 'ComfortWords']);
    expect(JSON.parse(c.WebSearchAgentConfig.ParamsString).bot_id).not.toBe('Your AskEcho Bot ID');
  }
}

test.each(Object.values(SCENE))('scene %s follows the Flexible request contract', (scene) => {
  vi.stubEnv('REACT_APP_MODE', 'flexible');
  const factory = new ConfigFactory();
  Object.assign(factory, getSceneSettings(scene));
  flexible(JSON.parse(JSON.stringify(factory.config)));
});

test.each([Provider.Byteplus, Provider.Amazon, Provider.GoogleAsrV1, Provider.GoogleAsrV2])(
  'ASR provider %s uses the documented wire name', (provider) => {
    vi.stubEnv('REACT_APP_MODE', 'flexible');
    const factory = new ConfigFactory();
    factory['Provider.ASR'] = provider;
    flexible(JSON.parse(JSON.stringify(factory.config)));
  }
);

test.each([Provider.Byteplus, Provider.Amazon, Provider.OpenAI, Provider.Google])(
  'TTS provider %s uses the documented fields', (provider) => {
    vi.stubEnv('REACT_APP_MODE', 'flexible');
    const factory = new ConfigFactory();
    factory['Provider.TTS'] = provider;
    flexible(JSON.parse(JSON.stringify(factory.config)));
  }
);

test.each([Provider.Byteplus, Provider.OpenAI, Provider.Google, Provider.CustomLLM])(
  'LLM provider %s uses the documented discriminator', (provider) => {
    vi.stubEnv('REACT_APP_MODE', 'flexible');
    const factory = new ConfigFactory();
    factory['Provider.LLM'] = provider;
    flexible(JSON.parse(JSON.stringify(factory.config)));
  }
);

test.each(['1.0', '2.0'])('Seed ASR %s preserves the requested language', (version) => {
  const asr = new ASRManager();
  asr.seedAsrVersion = version;
  for (const language of ['en-US', 'zh-CN', 'en-US']) {
    asr.language = language;
    expect(asr.value.ProviderParams.Language).toBe(language);
    expect(asr.value.ProviderParams.ApiResourceId).toBe(version === '2.0' ? 'volc.seedasr.sauc.duration' : 'volc.bigasr.sauc.duration');
    expect(asr.value.ProviderParams.StreamMode).toBe(version === '2.0' ? 2 : 0);
    expect(asr.value.ProviderParams.enable_nonstream).toBe(version === '2.0' ? true : undefined);
  }
});

test.each([Provider.None, Provider.Akool])('Flexible avatar %s follows its supported provider contract', (provider) => {
  vi.stubEnv('REACT_APP_MODE', 'flexible');
  const factory = new ConfigFactory();
  factory['Provider.Avatar'] = provider;
  flexible(JSON.parse(JSON.stringify(factory.config)));
});

test('avatar capabilities follow the selected API', () => {
  expect(Object.keys(AvatarMap).sort()).toEqual([Provider.None, Provider.Akool].sort());
  expect(Object.keys(RealtimeAvatarMap).sort()).toEqual([Provider.None, Provider.Byteplus].sort());
  vi.stubEnv('REACT_APP_MODE', 'flexible');
  expect(() => { new ConfigFactory()['Provider.Avatar'] = Provider.Byteplus; }).toThrow('Akool');
});

test.each([Provider.None, Provider.Byteplus])('Realtime avatar %s uses the Realtime request shape', (provider) => {
  vi.stubEnv('REACT_APP_MODE', 'realtime');
  const factory = new ConfigFactory();
  factory['Provider.Avatar'] = provider;
  const body = JSON.parse(JSON.stringify(factory.config));
  keys(body, ['AppId', 'RoomId', 'TaskId', 'AgentConfig', 'LLMConfig', 'AvatarConfig']);
  keys(body.AgentConfig, ['UserId', 'TargetUserID', 'WelcomeMessage'], ['UserId', 'TargetUserID']);
  expect(body.AgentConfig.UserId).toBe(factory.BotName);
  keys(body.LLMConfig, ['Provider', 'Token', 'Voice', 'Instructions', 'Temperature', 'TurnDetection']);
  expect(body.LLMConfig.Provider).toBe('openai');
  expect(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']).toContain(body.LLMConfig.Voice);
  if (body.AvatarConfig) keys(body.AvatarConfig, ['Enabled', 'AvatarAppID', 'AvatarToken', 'AvatarType', 'AvatarRole', 'BackgroundUrl', 'VideoBitrate']);
});
