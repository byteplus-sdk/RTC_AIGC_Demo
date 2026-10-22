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

module.exports = { isGoogleLlm, getLlmCredentialField, getLlmApiKey, getSpeechProviderKey };
