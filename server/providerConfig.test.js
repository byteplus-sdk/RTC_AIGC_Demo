const assert = require('node:assert/strict');
const test = require('node:test');
const { validateProviderConfig } = require('./providerConfig');
const { injectSensitiveInfo } = require('./sensitive');

test('Google model validation requires its own key', () => {
  const body = { Config: { LLMConfig: {
    Mode: 'CustomLLM', Url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  } } };
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, { OPENAI_API_KEY: 'openai' }), /GOOGLE_LLM_API_KEY/);
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', body, { GOOGLE_LLM_API_KEY: 'google' }));
});

test('Google credentials are injected for the exact Google origin', () => {
  const body = { Config: { LLMConfig: {
    Mode: 'CustomLLM', Url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  } } };
  injectSensitiveInfo(body, true, { env: { GOOGLE_LLM_API_KEY: 'google-test-key' } });
  assert.equal(body.Config.LLMConfig.APIKey, 'google-test-key');
});

test('enabled avatars require the selected provider credentials', () => {
  const body = { Config: { AvatarConfig: { Enabled: true, Provider: 'Akool' } } };
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, {}), /AKOOL_API_KEY/);
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', body, { AKOOL_API_KEY: 'test-key' }));
  assert.doesNotThrow(() => validateProviderConfig('StopVoiceChat', body, {}));
  body.Config.AvatarConfig = { Enabled: false };
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', body, {}));
  body.Config.AvatarConfig = { Enabled: true };
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, {}), /AVATAR_APP_ID/);
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, { AVATAR_APP_ID: 'app' }), /AVATAR_TOKEN/);
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', body, { AVATAR_APP_ID: 'app', AVATAR_TOKEN: 'test-token' }));
});

test('BytePlus TTS validates and receives speech credentials', () => {
  const body = { Config: { TTSConfig: { Provider: 'BytePlus', ProviderParams: { app: {}, ResourceId: 'seed-tts-2.0' } } } };
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, {}), /BYTEPLUS_SEED_SPEECH_APP_ID/);
  const env = { BYTEPLUS_SEED_SPEECH_APP_ID: 'test-app', BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN: 'test-token' };
  validateProviderConfig('StartVoiceChat', body, env);
  injectSensitiveInfo(body, true, { env });
  assert.equal(body.Config.TTSConfig.ProviderParams.app.appid, 'test-app');
  assert.equal(body.Config.TTSConfig.ProviderParams.app.token, 'test-token');
  assert.equal(body.Config.TTSConfig.ProviderParams.ResourceId, 'seed-tts-2.0');
});


test('Realtime avatars require credentials from the root configuration', () => {
  const body = { AvatarConfig: { Enabled: true } };
  const env = { OPENAI_API_KEY: 'test-openai-key' };
  assert.throws(() => validateProviderConfig('StartVoiceChatWithRealtimeAPI', body, env), /AVATAR_APP_ID/);
  assert.throws(() => validateProviderConfig('StartVoiceChatWithRealtimeAPI', body, { ...env, AVATAR_APP_ID: 'app' }), /AVATAR_TOKEN/);
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChatWithRealtimeAPI', body, {
    ...env, AVATAR_APP_ID: 'app', AVATAR_TOKEN: 'test-token',
  }));
  assert.doesNotThrow(() => validateProviderConfig('StopVoiceChatWithRealtimeAPI', body, {}));
  body.AvatarConfig.Enabled = false;
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChatWithRealtimeAPI', body, env));
});
