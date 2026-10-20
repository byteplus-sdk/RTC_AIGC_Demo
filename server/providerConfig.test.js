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
