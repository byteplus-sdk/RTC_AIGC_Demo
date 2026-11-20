const { required } = require('./config');
const { validateAiGatewayParams } = require('../shared/aiGateway.mjs');

function getLlmCredentialField(config, env) {
  const address = readCanonicalField(config, 'Url');
  const provider = readCanonicalField(config, 'Provider');
  const mode = readCanonicalField(config, 'Mode');
  if (provider === 'BytePlus' || mode === 'BytePlusArk') {
    if (address !== undefined) throw new Error('BytePlus LLM uses EndPointId instead of Url');
    return 'BYTEPLUS_MODEL_API_KEY';
  }
  if (provider === 'OpenAI' && address === undefined) return 'OPENAI_API_KEY';
  const url = typeof address === 'string' && URL.parse(address);
  if (!url || url.protocol !== 'https:' || !/^https:\/\//i.test(address) ||
      /[\\\s]/.test(address) || url.username || url.password || address.split('/')[2].includes('@')) {
    throw new Error('LLMConfig.Url must be an HTTPS URL without credentials');
  }
  if (url.origin === 'https://api.openai.com') return 'OPENAI_API_KEY';
  if (url.origin === 'https://generativelanguage.googleapis.com') return 'GOOGLE_LLM_API_KEY';
  if (address !== env.CUSTOM_LLM_URL?.trim()) throw new Error('LLMConfig.Url must match CUSTOM_LLM_URL');
  return 'CUSTOM_LLM_API_KEY';
}

function getLlmApiKey(config, env) {
  const field = getLlmCredentialField(config, env);
  return required(env[field], field);
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
    const llm = readCanonicalField(config, 'LLMConfig');
    if (llm) getLlmApiKey(llm, env);
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

module.exports = { validateProviderConfig, getLlmCredentialField, getLlmApiKey, getSpeechProviderKey, getGatewayCredentials, validateGatewayConfig };
