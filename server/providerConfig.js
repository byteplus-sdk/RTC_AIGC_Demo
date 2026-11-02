const { required } = require('./config');
const { validateAiGatewayParams } = require('../shared/aiGateway.mjs');

function isGoogleLlm(config) {
  try {
    return new URL(config?.Url).origin === 'https://generativelanguage.googleapis.com';
  } catch {
    return false;
  }
}

function getLlmCredentialField(config) {
  if (config?.Provider === 'BytePlus' || config?.Mode === 'BytePlusArk') return 'BYTEPLUS_MODEL_API_KEY';
  if (isGoogleLlm(config)) return 'GOOGLE_LLM_API_KEY';
  if (config?.Provider === 'OpenAI') return 'OPENAI_API_KEY';
  try {
    if (new URL(config?.Url).origin === 'https://api.openai.com') return 'OPENAI_API_KEY';
  } catch {}
  return 'CUSTOM_LLM_API_KEY';
}

function getLlmApiKey(config, env) {
  const field = getLlmCredentialField(config);
  return env[field] || (field === 'CUSTOM_LLM_API_KEY' ? env.OPENAI_API_KEY : undefined);
}

function getSpeechProviderKey(provider) {
  return { Amazon: 'amazon', OpenAI: 'openai', byteplus_Bidirectional_streaming: 'BytePlus' }[provider] || provider;
}

function getGatewayCredentials(kind, env) {
  const urlField = `${kind}_GATEWAY_API_URL`;
  const keyField = `${kind}_GATEWAY_API_KEY`;
  return { URL: required(env[urlField], urlField), APIKey: required(env[keyField], keyField) };
}

function validateGatewayConfig(body, kind, env) {
  const field = `${kind}Config`;
  const speech = body.Config[field];
  try {
    // Keep the credential path unambiguous for case-insensitive RTC decoders.
    const path = [[body, 'Config'], [body.Config, field], [speech, 'Provider'], [speech, 'ProviderParams']];
    for (const [parent, name] of path) {
      if (Object.keys(parent).some((key) => key !== name && key.toUpperCase() === name.toUpperCase())) {
        throw new Error(`${kind} AI Gateway has an ambiguous ${name} field`);
      }
    }
    validateAiGatewayParams(speech.ProviderParams, kind);
  } catch (error) {
    error.status = 400;
    throw error;
  }

  const { URL: url } = getGatewayCredentials(kind, env);
  const parsed = URL.parse(url);
  if (!parsed || !/^wss?:\/\//i.test(url) || parsed.username || parsed.password || url.includes('#')) {
    throw new Error(`${kind}_GATEWAY_API_URL must be a WebSocket URL (ws:// or wss://) without credentials or a fragment`);
  }
}

module.exports = { isGoogleLlm, getLlmCredentialField, getLlmApiKey, getSpeechProviderKey, getGatewayCredentials, validateGatewayConfig };
