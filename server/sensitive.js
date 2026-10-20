/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */
const merge = require('lodash/merge');
const { isGoogleLlm } = require('./providerConfig');

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

/**
 * @brief RTC AppKey
 * @refer https://console.byteplus.com/rtc/listRTC
 */
const RTC_APP_KEY = process.env.RTC_APP_KEY || 'Your RTC App Key';

/**
 * @brief AskEcho Search Agent API key (injected into `WebSearchAgentConfig.APIKey` when enabled).
 */
const AskEchoSearchAgentAPIKey = process.env.ASKECHO_API_KEY || 'Your AskEcho API Key';

/**
 * @brief Sensitive fields in Flexible Mode (VoiceChat Mode).
 */
const VOICE_CHAT_MODE = {
  ASRConfig: {
    ProviderParams: {
      amazon: {
        /**
         * @note Amazon Access key ID. For detail, see Create new access keys for an IAM user.
         * @refer https://docs.aws.amazon.com/keyspaces/latest/devguide/create.keypair.html
         */
        ID: process.env.AWS_ACCESS_KEY_ID || 'Your ID',
        /**
         * @note Amazon Secret access key. For detail, see Create new access keys for an IAM user.
         * @refer https://docs.aws.amazon.com/keyspaces/latest/devguide/create.keypair.html
         */
        Secret: process.env.AWS_SECRET_ACCESS_KEY || 'Your Secret',
      },
      google: {
        /**
         * @refer https://cloud.google.com/docs/authentication/application-default-credentials#GAC
         */
        CredentialsJSON: process.env.GOOGLE_CREDENTIALS_JSON || 'Your Credentials JSON',
      },
      /** Google Cloud Speech-to-Text v1 (`ASRConfig.Provider` = `Google`). */
      Google: {
        CredentialsJSON: process.env.GOOGLE_CREDENTIALS_JSON || 'Your Credentials JSON',
      },
      /** Google Cloud Speech-to-Text v2 (`ASRConfig.Provider` = `GoogleV2`). */
      GoogleV2: {
        CredentialsJSON: process.env.GOOGLE_CREDENTIALS_JSON || 'Your Credentials JSON',
        RecognizerPath: process.env.GOOGLE_RECOGNIZER_PATH || 'Your Recognizer Path',
      },
      BytePlus: {
        /**
         * @note The AppId obtained on BytePlus ASR Console, used to identify the application.
         * @refer https://console.byteplus.com/voice/service/1000017
         */
        AppId: process.env.BYTEPLUS_SEED_SPEECH_APP_ID || 'Your AppId',
        /**
         * @brief AccessToken obtained on BytePlus ASR Console, used for authentication.
         * @refer https://console.byteplus.com/voice/service/1000017
         */
        AccessToken: process.env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN || 'Your AccessToken',
        /**
         * @note ApiResourceId is set by the frontend (Seed ASR 1.0 / 2.0).
         */
      },
    },
  },
  TTSConfig: {
    ProviderParams: {
      byteplus_Bidirectional_streaming: {
        app: {
          /**
           * @note App ID obtained on BytePlus Text-to-Speech Console, used to identify the application.
           * @refer https://console.byteplus.com/voice/service/1000014?
           */
          appid: process.env.BYTEPLUS_SEED_SPEECH_APP_ID || 'Your App ID',
          /**
           * @note The Access Token corresponding to the App ID of Text-to-Speech service, used for identity authentication. You can obtain it by on BytePlus Text-to-Speech Console.
           * @refer https://console.byteplus.com/voice/service/1000014?
           */
          token: process.env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN || 'Your Access Token',
        },
      },
      amazon: {
        /**
         * @note Amazon Access key ID. For detail, see Create new access keys for an IAM user.
         * @refer https://docs.aws.amazon.com/keyspaces/latest/devguide/create.keypair.html
         */
        ID: process.env.AWS_ACCESS_KEY_ID || 'Your ID',
        /**
         * @note Amazon Secret access key. For detail, see Create new access keys for an IAM user.
         * @refer https://docs.aws.amazon.com/keyspaces/latest/devguide/create.keypair.html
         */
        Secret: process.env.AWS_SECRET_ACCESS_KEY || 'Your Secret',
      },
      openai: {
        /**
         * @note Fixed to the value: https://api.openai.com/v1/audio/speech
         * @example https://api.openai.com/v1/audio/speech
         */
        URL: process.env.OPENAI_TTS_URL || 'https://api.openai.com/v1/audio/speech',
        /**
         * @note APIKey. Acquire on api-keys.
         * @refer https://platform.openai.com/api-keys
         */
        APIKey: process.env.OPENAI_API_KEY || 'Your OpenAI API Key',
      },
      /** Google Cloud Text-to-Speech (`TTSConfig.Provider` = `Google`, rtc-aigc-demo shape). */
      Google: {
        /**
         * @refer https://cloud.google.com/docs/authentication/application-default-credentials#GAC
         */
        CredentialsJSON: process.env.GOOGLE_CREDENTIALS_JSON || 'Your Credentials JSON',
      },
    },
  },
  LLMConfig: {
    CustomLLM: {
      /**
       * @brief APIKey, acquire on https://platform.openai.com/api-keys
       */
      APIKey: process.env.CUSTOM_LLM_API_KEY || process.env.OPENAI_API_KEY || 'Your API Key',
    },
    BytePlusArk: {
      /**
       * @note APIKey. Acquire on View API Key.
       * @refer https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint?config=%7B%7D
       */
      APIKey: process.env.BYTEPLUS_MODEL_API_KEY || 'Your API Key',
    },
  },
  AvatarConfig: {
    [AVATAR_PROVIDER.VOLCANO]: {
      AvatarAppID: process.env.AVATAR_APP_ID || 'Your Avatar App ID',
      AvatarToken: process.env.AVATAR_TOKEN || 'Your Avatar Token',
    },
    [AVATAR_PROVIDER.AKOOL]: {
      ApiKey: process.env.AKOOL_API_KEY || 'Your Akool API Key',
    },
  },
  // SubtitleConfig: {
  //   /**
  //    * @brief Subtitle callback configuration.
  //    * @note Callbacks can be received through the client or server. The message format is binary and needs to be parsed before use. For detailed instructions, see Real-time Subtitles.
  //    * @refer https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1558163#byteplusasr
  //    */
  //   SubtitleMode: 0,
  // },
};

/**
 * @brief Sensitive fields in RealTime Mode.
 */
const REALTIME_API_MODE = {
  LLMConfig: {
    /**
     * @brief API key of OpenAI.
     * @refer https://platform.openai.com/api-keys
     */
    Token: process.env.OPENAI_API_KEY || 'Your OpenAI Token',
  },
  AvatarConfig: {
    [AVATAR_PROVIDER.VOLCANO]: {
      AvatarAppID: process.env.AVATAR_APP_ID || 'Your Realtime Avatar App ID',
      AvatarToken: process.env.AVATAR_TOKEN || 'Your Realtime Avatar Token',
    },
  },
};

/**
 * @brief Inject sensitive info.
 * @param body Request body.
 * @param isVoiceChatMode Whether voice chat mode.
 */
const injectSensitiveInfo = (body, isVoiceChatMode) => {
  if (isVoiceChatMode) {
    /** Inject voice chat mode sensitive info */
    if (body?.Config?.ASRConfig?.ProviderParams) {
      body.Config.ASRConfig.ProviderParams = merge(
        body.Config?.ASRConfig?.ProviderParams,
        VOICE_CHAT_MODE.ASRConfig.ProviderParams[body.Config?.ASRConfig?.Provider]
      );
    }
    if (body?.Config?.TTSConfig?.ProviderParams) {
      body.Config.TTSConfig.ProviderParams = merge(
        body.Config?.TTSConfig?.ProviderParams,
        VOICE_CHAT_MODE.TTSConfig.ProviderParams[body.Config?.TTSConfig?.Provider]
      );
    }
    if (body?.Config?.LLMConfig) {
      body.Config.LLMConfig = merge(
        body.Config?.LLMConfig,
        VOICE_CHAT_MODE.LLMConfig[body.Config?.LLMConfig?.Mode]
      );
      if (body.Config.LLMConfig.Mode === 'CustomLLM' && isGoogleLlm(body.Config.LLMConfig)) {
        body.Config.LLMConfig.APIKey = process.env.GOOGLE_LLM_API_KEY || '';
      }
    }
    if (body?.Config?.AvatarConfig) {
      body.Config.AvatarConfig = mergeAvatarSensitiveByProvider(
        body.Config.AvatarConfig,
        VOICE_CHAT_MODE.AvatarConfig
      );
    }
    if (body?.Config?.SubtitleConfig) {
      body.Config.SubtitleConfig = merge(
        body.Config?.SubtitleConfig,
        VOICE_CHAT_MODE.SubtitleConfig
      );
    }
    const webSearch = body?.Config?.WebSearchAgentConfig;
    if (webSearch?.Enable === true && AskEchoSearchAgentAPIKey) {
      body.Config.WebSearchAgentConfig = merge(webSearch, {
        APIKey: AskEchoSearchAgentAPIKey,
      });
    }
  } else {
    /** Inject realtime mode sensitive info */
    body.LLMConfig && (body.LLMConfig = merge(body.LLMConfig, REALTIME_API_MODE.LLMConfig));
    if (body?.AvatarConfig) {
      body.AvatarConfig = mergeAvatarSensitiveByProvider(
        body.AvatarConfig,
        REALTIME_API_MODE.AvatarConfig
      );
    }
  }
};

module.exports = {
  ACCOUNT_ID,
  SUB_ACCOUNT_NAME,
  ACCOUNT_INFO,
  VOICE_CHAT_MODE,
  REALTIME_API_MODE,
  RTC_APP_KEY,
  AskEchoSearchAgentAPIKey,
  injectSensitiveInfo,
};
