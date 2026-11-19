/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */
const merge = require('lodash/merge');
const { getLlmApiKey, getSpeechProviderKey, getGatewayCredentials } = require('./providerConfig');

const AVATAR_PROVIDER = {
  VOLCANO: 'Volcano',
  AKOOL: 'Akool',
};

/** AvatarConfig: inject secrets by Provider (Volcano / legacy flat / Akool). */
function mergeAvatarSensitiveByProvider(client, sensitiveByProvider) {
  const mergedAv = merge({}, client || {});
  const raw = mergedAv.Provider;
  const providerKey = typeof raw === 'string' && raw !== '' ? raw : AVATAR_PROVIDER.VOLCANO;
  const secrets = sensitiveByProvider[providerKey];
  if (secrets && typeof secrets === 'object') {
    if (providerKey === AVATAR_PROVIDER.VOLCANO) {
      if (secrets.AvatarAppID != null) mergedAv.AvatarAppID = secrets.AvatarAppID;
      if (secrets.AvatarToken != null) mergedAv.AvatarToken = secrets.AvatarToken;
      if (mergedAv.ProviderParams) {
        mergedAv.ProviderParams = merge({}, mergedAv.ProviderParams, {
          ...(secrets.AvatarAppID != null ? { AvatarAppID: secrets.AvatarAppID } : {}),
          ...(secrets.AvatarToken != null ? { AvatarToken: secrets.AvatarToken } : {}),
        });
      }
    } else if (providerKey === AVATAR_PROVIDER.AKOOL) {
      const patch = {};
      if (secrets.ApiKey != null) patch.ApiKey = secrets.ApiKey;
      mergedAv.ProviderParams = merge({}, mergedAv.ProviderParams || {}, patch);
    }
  }
  return mergedAv;
}

/**
 * @note Not required, if you invoke getSessionToken to generate sessionToken, you should fill it.
 * @refer https://console.byteplus.com/user/basics/
 */
const ACCOUNT_ID = 'Your Account ID';

/**
 * @note Not required, if you invoke getSessionToken to generate sessionToken, you should fill it.
 */
const SUB_ACCOUNT_NAME = 'Your Sub Account Name';

/**
 * @note Sign up for AK/SK.
 *        You can manage your AK/SK via https://console.byteplus.com/iam/keymanage
 */
const ACCOUNT_INFO = {
  /**
   * @note Required, get from https://console.byteplus.com/iam/keymanage
   */
  accessKeyId: process.env.BYTEPLUS_ACCESS_KEY_ID || 'Your Access Key ID',
  /**
   * @note Required, get from https://console.byteplus.com/iam/keymanage
   */
  secretKey: process.env.BYTEPLUS_SECRET_ACCESS_KEY || 'Your Secret Key',
};

function speechCredentials(kind, provider, env) {
  switch (getSpeechProviderKey(provider)) {
    case 'BytePlus':
      return kind === 'ASR'
        ? { AppId: env.BYTEPLUS_SEED_SPEECH_APP_ID, AccessToken: env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN }
        : { app: { appid: env.BYTEPLUS_SEED_SPEECH_APP_ID, token: env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN } };
    case 'amazon':
      return { ID: env.AWS_ACCESS_KEY_ID, Secret: env.AWS_SECRET_ACCESS_KEY };
    case 'Google':
      return { CredentialsJSON: env.GOOGLE_CREDENTIALS_JSON };
    case 'google':
      if (kind !== 'ASR') return;
      return { CredentialsJSON: env.GOOGLE_CREDENTIALS_JSON };
    case 'GoogleV2':
      if (kind !== 'ASR') return;
      return { CredentialsJSON: env.GOOGLE_CREDENTIALS_JSON, RecognizerPath: env.GOOGLE_RECOGNIZER_PATH };
    case 'openai':
      if (kind !== 'TTS') return;
      return { URL: env.OPENAI_TTS_URL || 'https://api.openai.com/v1/audio/speech', APIKey: env.OPENAI_API_KEY };
  }
}

/**
 * @brief Inject sensitive info.
 * @param body Request body.
 * @param isVoiceChatMode Whether voice chat mode.
 */
const injectSensitiveInfo = (body, isVoiceChatMode, { action, env = process.env } = {}) => {
  const avatarCredentials = {
    [AVATAR_PROVIDER.VOLCANO]: { AvatarAppID: env.AVATAR_APP_ID, AvatarToken: env.AVATAR_TOKEN },
    [AVATAR_PROVIDER.AKOOL]: isVoiceChatMode ? { ApiKey: env.AKOOL_API_KEY } : undefined,
  };
  if (isVoiceChatMode) {
    /** Inject voice chat mode sensitive info */
    for (const kind of ['ASR', 'TTS']) {
      const field = `${kind}Config`;
      const speech = body?.Config?.[field];
      if (speech?.Provider === 'ai_gateway' && action === 'StartVoiceChat') {
        speech.ProviderParams = merge(speech.ProviderParams || {}, getGatewayCredentials(kind, env));
      } else if (speech?.ProviderParams) {
        const credentials = speechCredentials(kind, speech.Provider, env);
        speech.ProviderParams = merge(speech.ProviderParams, credentials);
      }
    }
    if (body?.Config?.LLMConfig) {
      body.Config.LLMConfig.APIKey = getLlmApiKey(body.Config.LLMConfig, env);
    }
    if (body?.Config?.AvatarConfig) {
      body.Config.AvatarConfig = mergeAvatarSensitiveByProvider(
        body.Config.AvatarConfig,
        avatarCredentials
      );
    }
    const webSearch = body?.Config?.WebSearchAgentConfig;
    if (webSearch?.Enable === true && env.ASKECHO_API_KEY) {
      body.Config.WebSearchAgentConfig = merge(webSearch, {
        APIKey: env.ASKECHO_API_KEY,
        ParamsString: JSON.stringify({
          ...JSON.parse(webSearch.ParamsString || '{}'),
          ...(env.ASKECHO_BOT_ID ? { bot_id: env.ASKECHO_BOT_ID } : {}),
        }),
      });
    }
  } else {
    /** Inject realtime mode sensitive info */
    body.LLMConfig && (body.LLMConfig = merge(body.LLMConfig, { Token: env.OPENAI_API_KEY }));
    if (body?.AvatarConfig) {
      body.AvatarConfig = mergeAvatarSensitiveByProvider(
        body.AvatarConfig,
        avatarCredentials
      );
    }
  }
};

module.exports = {
  ACCOUNT_ID,
  SUB_ACCOUNT_NAME,
  ACCOUNT_INFO,
  injectSensitiveInfo,
};
