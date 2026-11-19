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

function readCanonicalField(parent, name) {
  if (Object.keys(parent ?? {}).some((key) => key !== name && key.toUpperCase() === name.toUpperCase())) {
    throw new Error(`Use the exact field name ${name}`);
  }
  return parent?.[name];
}

function validateGatewayConfig(body, kind, env) {
  try {
    const config = readCanonicalField(body, 'Config');
    const speech = readCanonicalField(config, `${kind}Config`);
    if (readCanonicalField(speech, 'Provider') !== 'ai_gateway') return;
    validateAiGatewayParams(readCanonicalField(speech, 'ProviderParams'), kind);
  } catch (error) {
    error.status = 400;
    throw error;
  }

  const { URL: url } = getGatewayCredentials(kind, env);
  const parsed = URL.parse(url);
  if (!parsed || !/^wss:\/\//i.test(url) || parsed.username || parsed.password || url.includes('#')) {
    throw new Error(`${kind}_GATEWAY_API_URL must be a secure WebSocket URL (wss://) without credentials or a fragment`);
  }
}

function validateProviderConfig(action, body, env) {
  if (!action.startsWith('Start')) return;
  const fields = [];
  const speech = ['BYTEPLUS_SEED_SPEECH_APP_ID', 'BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN'];
  const amazon = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const google = ['GOOGLE_CREDENTIALS_JSON'];
  const flexible = action === 'StartVoiceChat';
  if (flexible) {
    const config = body?.Config;
    for (const kind of ['ASR', 'TTS']) {
      validateGatewayConfig(body, kind, env);
    }
    fields.push(...({
      BytePlus: speech, Amazon: amazon, amazon, google, Google: google,
      GoogleV2: [...google, 'GOOGLE_RECOGNIZER_PATH'],
    }[config?.ASRConfig?.Provider] || []));
    fields.push(...({
      BytePlus: speech, byteplus_Bidirectional_streaming: speech, Amazon: amazon, amazon, Google: google,
      OpenAI: ['OPENAI_API_KEY'], openai: ['OPENAI_API_KEY'],
    }[config?.TTSConfig?.Provider] || []));
    if (config?.LLMConfig) {
      const field = getLlmCredentialField(config.LLMConfig);
      required(getLlmApiKey(config.LLMConfig, env), field === 'CUSTOM_LLM_API_KEY' ? 'CUSTOM_LLM_API_KEY or OPENAI_API_KEY' : field);
    }
    if (config?.WebSearchAgentConfig?.Enable === true) {
      required(env.ASKECHO_API_KEY, 'ASKECHO_API_KEY');
      const params = JSON.parse(config.WebSearchAgentConfig.ParamsString || '{}');
      required(env.ASKECHO_BOT_ID || params.bot_id, 'ASKECHO_BOT_ID');
      const name = config.WebSearchAgentConfig.FunctionName || 'WebSearch';
      if (config.LLMConfig?.MCP?.some((item) => item.Name === name)) {
        throw new Error(`MCP name conflicts with web search: ${name}`);
      }
    }
  } else {
    fields.push('OPENAI_API_KEY');
  }
  const avatar = flexible ? body?.Config?.AvatarConfig : body?.AvatarConfig;
  if (avatar?.Enabled) {
    fields.push(...(avatar.Provider === 'Akool' ? ['AKOOL_API_KEY'] : ['AVATAR_APP_ID', 'AVATAR_TOKEN']));
  }
  for (const field of new Set(fields)) required(env[field], field);
}

module.exports = { validateProviderConfig, isGoogleLlm, getLlmCredentialField, getLlmApiKey, getSpeechProviderKey, getGatewayCredentials, validateGatewayConfig };
