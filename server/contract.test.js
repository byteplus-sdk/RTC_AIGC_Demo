const assert = require('node:assert/strict');
const test = require('node:test');
const { validateProviderConfig } = require('./app');
const { getLlmCredentialField, getLlmApiKey } = require('./providerConfig');

const env = {
  BYTEPLUS_MODEL_API_KEY: 'test-ark', OPENAI_API_KEY: 'test-openai',
  CUSTOM_LLM_API_KEY: 'test-custom', GOOGLE_LLM_API_KEY: 'test-google',
  BYTEPLUS_SEED_SPEECH_APP_ID: 'test-speech-app', BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN: 'test-speech-token',
  AWS_ACCESS_KEY_ID: 'test-amazon-id', AWS_SECRET_ACCESS_KEY: 'test-amazon-secret',
  GOOGLE_CREDENTIALS_JSON: '{"type":"service_account"}', GOOGLE_RECOGNIZER_PATH: 'projects/test/locations/global/recognizers/test',
  ASKECHO_API_KEY: 'test-search', ASKECHO_BOT_ID: 'test-bot',
  AKOOL_API_KEY: 'test-akool', AVATAR_APP_ID: 'test-avatar-app', AVATAR_TOKEN: 'test-avatar-token',
};

function inject(body, flexible = true) {
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  const modulePath = require.resolve('./sensitive');
  const cached = require.cache[modulePath];
  delete require.cache[modulePath];
  try {
    require('./sensitive').injectSensitiveInfo(body, flexible);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (cached) require.cache[modulePath] = cached; else delete require.cache[modulePath];
  }
  return body;
}

for (const [llm, field] of [
  [{ Provider: 'BytePlus', EndPointId: 'ep-test' }, 'BYTEPLUS_MODEL_API_KEY'],
  [{ Provider: 'OpenAI', Url: 'https://api.openai.com/v1/chat/completions' }, 'OPENAI_API_KEY'],
  [{ Mode: 'CustomLLM', Url: 'https://custom.example.com/chat/completions' }, 'CUSTOM_LLM_API_KEY'],
  [{ Mode: 'CustomLLM', Url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' }, 'GOOGLE_LLM_API_KEY'],
]) {
  test(`LLM ${field} validates and injects its own credential`, () => {
    assert.equal(getLlmCredentialField(llm), field);
    assert.equal(getLlmApiKey(llm, env), env[field]);
    const body = { Config: { LLMConfig: { ...llm } } };
    validateProviderConfig('StartVoiceChat', body, env);
    assert.throws(() => validateProviderConfig('StartVoiceChat', body, {}), new RegExp(field));
    inject(body);
    assert.equal(body.Config.LLMConfig.APIKey, env[field]);
  });
}

test('Google credential routing uses the exact HTTPS origin', () => {
  for (const Url of ['https://generativelanguage.googleapis.com.example.com/', 'http://generativelanguage.googleapis.com/']) {
    assert.equal(getLlmCredentialField({ Mode: 'CustomLLM', Url }), 'CUSTOM_LLM_API_KEY');
  }
});

for (const [Provider, params, expected] of [
  ['BytePlus', { Mode: 'SeedASR', Language: 'en-US', ApiResourceId: 'volc.seedasr.sauc.duration', StreamMode: 2, enable_nonstream: true }, { AppId: env.BYTEPLUS_SEED_SPEECH_APP_ID, AccessToken: env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN }],
  ['Amazon', { Region: 'us-west-2', Language: 'en-US' }, { ID: env.AWS_ACCESS_KEY_ID, Secret: env.AWS_SECRET_ACCESS_KEY }],
  ['Google', { Language: 'en-US', Model: 'latest_long' }, { CredentialsJSON: env.GOOGLE_CREDENTIALS_JSON }],
  ['GoogleV2', { LanguageCodes: ['en-US'], Model: 'latest_long' }, { CredentialsJSON: env.GOOGLE_CREDENTIALS_JSON, RecognizerPath: env.GOOGLE_RECOGNIZER_PATH }],
]) {
  test(`ASR ${Provider} retains request parameters during credential injection`, () => {
    const body = { Config: { ASRConfig: { Provider, ProviderParams: structuredClone(params) } } };
    validateProviderConfig('StartVoiceChat', body, env);
    inject(body);
    assert.equal(body.Config.ASRConfig.Provider, Provider);
    assert.deepEqual(body.Config.ASRConfig.ProviderParams, { ...params, ...expected });
  });
}

for (const [Provider, params, expected] of [
  ['BytePlus', { app: {}, audio: { voice_type: 'zh_female_vv_uranus_bigtts' }, ResourceId: 'seed-tts-2.0' }, { app: { appid: env.BYTEPLUS_SEED_SPEECH_APP_ID, token: env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN } }],
  ['Amazon', { VoiceID: 'Matthew', Language: 'en-US', Region: 'us-west-2' }, { ID: env.AWS_ACCESS_KEY_ID, Secret: env.AWS_SECRET_ACCESS_KEY }],
  ['OpenAI', { Model: 'tts-1', Voice: 'alloy', Speed: '1.0' }, { URL: 'https://api.openai.com/v1/audio/speech', APIKey: env.OPENAI_API_KEY }],
  ['Google', { VoiceSelection: { Name: 'en-US-Chirp3-HD-Aoede', LanguageCode: 'en-US' }, StreamingAudioConfig: { SpeakingRate: 1 } }, { CredentialsJSON: env.GOOGLE_CREDENTIALS_JSON }],
]) {
  test(`TTS ${Provider} retains the documented schema after credential injection`, () => {
    const body = { Config: { TTSConfig: { Provider, ProviderParams: structuredClone(params) } } };
    validateProviderConfig('StartVoiceChat', body, env);
    inject(body);
    assert.equal(body.Config.TTSConfig.Provider, Provider);
    assert.deepEqual(body.Config.TTSConfig.ProviderParams, { ...params, ...expected });
  });
}

test('web search requires and injects the configured bot ID', () => {
  const body = { Config: { WebSearchAgentConfig: { Enable: true, ParamsString: '{"stream":true}', FunctionName: 'web_search' } } };
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, { ASKECHO_API_KEY: 'key' }), /ASKECHO_BOT_ID/);
  validateProviderConfig('StartVoiceChat', body, env);
  inject(body);
  assert.equal(body.Config.WebSearchAgentConfig.APIKey, env.ASKECHO_API_KEY);
  assert.deepEqual(JSON.parse(body.Config.WebSearchAgentConfig.ParamsString), { stream: true, bot_id: env.ASKECHO_BOT_ID });
});

test('MCP names cannot collide with an enabled search tool', () => {
  const body = { Config: {
    LLMConfig: { Provider: 'BytePlus', MCP: [{ Name: 'web_search', URL: 'https://example.com/mcp' }] },
    WebSearchAgentConfig: { Enable: true, FunctionName: 'web_search' },
  } };
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, env), /MCP name conflicts/);
  body.Config.WebSearchAgentConfig.Enable = false;
  validateProviderConfig('StartVoiceChat', body, env);
});

test('avatar credentials stay in their API-specific schema', () => {
  const flexible = { Config: { AvatarConfig: { Enabled: true, Provider: 'Akool', ProviderParams: { AvatarId: 'test-id' } } } };
  validateProviderConfig('StartVoiceChat', flexible, env);
  inject(flexible);
  assert.deepEqual(flexible.Config.AvatarConfig, { Enabled: true, Provider: 'Akool', ProviderParams: { AvatarId: 'test-id', ApiKey: env.AKOOL_API_KEY } });
  const realtime = { AvatarConfig: { Enabled: true, AvatarRole: 'test-role' } };
  validateProviderConfig('StartVoiceChatWithRealtimeAPI', realtime, env);
  inject(realtime, false);
  assert.deepEqual(realtime.AvatarConfig, { Enabled: true, AvatarRole: 'test-role', AvatarAppID: env.AVATAR_APP_ID, AvatarToken: env.AVATAR_TOKEN });
});
