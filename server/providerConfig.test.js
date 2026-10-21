const assert = require('node:assert/strict');
const test = require('node:test');
const { isGoogleLlm } = require('./providerConfig');
const { validateProviderConfig } = require('./app');
const { injectSensitiveInfo } = require('./sensitive');

test('Google model validation requires its own key', () => {
  const body = { Config: { LLMConfig: {
    Mode: 'CustomLLM', Url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  } } };
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, { OPENAI_API_KEY: 'openai' }), /GOOGLE_LLM_API_KEY/);
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', body, { GOOGLE_LLM_API_KEY: 'google' }));
});

test('Google credentials are injected for the exact Google origin', () => {
  const previous = process.env.GOOGLE_LLM_API_KEY;
  process.env.GOOGLE_LLM_API_KEY = 'google-test-key';
  try {
    const body = { Config: { LLMConfig: {
      Mode: 'CustomLLM', Url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    } } };
    injectSensitiveInfo(body, true);
    assert.equal(body.Config.LLMConfig.APIKey, 'google-test-key');
    assert.equal(isGoogleLlm({ Url: 'https://generativelanguage.googleapis.com.example.com/' }), false);
    assert.equal(isGoogleLlm({ Url: 'http://generativelanguage.googleapis.com/' }), false);
    assert.equal(isGoogleLlm({ Url: 'invalid' }), false);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_LLM_API_KEY;
    else process.env.GOOGLE_LLM_API_KEY = previous;
  }
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
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', body, {
    BYTEPLUS_SEED_SPEECH_APP_ID: 'test-app', BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN: 'test-token',
  }));
  injectSensitiveInfo(body, true);
  assert.equal(typeof body.Config.TTSConfig.ProviderParams.app.appid, 'string');
  assert.equal(typeof body.Config.TTSConfig.ProviderParams.app.token, 'string');
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
