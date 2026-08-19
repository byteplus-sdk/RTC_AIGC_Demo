/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider } from '../basic';
import type { SeedVersion } from './seedVersion';

/**
 * @brief Flexible Mode (VoiceChat Mode) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316243
 *       Some sensitive fields not provided in frontend were injected by the server (See: Server/sensitive.js).
 */
export class ASRManager {
  provider: Provider.Amazon | Provider.Byteplus | Provider.GoogleAsrV1 | Provider.GoogleAsrV2;

  /** Seed ASR 1.0 vs 2.0 (default 2.0). */
  seedAsrVersion: SeedVersion = '2.0';

  #paramsMap: {
    [Provider.Amazon]: {
      Provider: Provider.Amazon;
      ProviderParams: {
        /**
         * @brief Create new access keys for an IAM user.
         * @note Injected by server, refer to Server/sensitive.js.
         * @refer https://docs.aws.amazon.com/keyspaces/latest/devguide/create.keypair.html
         */
        ID?: string;
        /**
         * @brief Create new access keys for an IAM user.
         * @note Injected by server, refer to Server/sensitive.js.
         * @refer https://docs.aws.amazon.com/keyspaces/latest/devguide/create.keypair.html
         */
        Secret?: string;
        /**
         * @refer https://console.aws.amazon.com/iam/
         */
        Region: 'us-west-2';
        /**
         * @refer https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html
         */
        Language: 'zh-CN' | 'en-US';
      };
    };
    [Provider.Byteplus]: {
      Provider: 'BytePlus';
      ProviderParams: {
        /**
         * @brief The model type.
         * @note This parameter is fixed to SeedASR, indicating the BytePlus ASR model (Speech-to-Text (ASR) - Streaming).
         * @refer https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1558163#byteplusasr
         */
        Mode: 'SeedASR';
        /**
         * @refer https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1558163#byteplusasr
         */
        Language?: 'zh-CN' | 'en-US';
        /**
         * @brief APP ID obtained on BytePlus ASR Console, used to identify the application.
         * @refer https://console.byteplus.com/voice/service/1000017
         */
        AppId?: string;
        /**
         * @brief AccessToken obtained on BytePlus ASR Console, used for authentication.
         * @refer https://console.byteplus.com/voice/service/1000017
         */
        AccessToken?: string;
        /**
         * @brief The service plan type for the BytePlus ASR Model.
         * @note Fixed to volc.bigasr.sauc.duration
         * @refer https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1558163#byteplusasr
         */
        ApiResourceId?: string;
        /**
         * @brief The output mode for ASR results:
         * @note ASR 1.0: 0 (streaming). ASR 2.0: only 1 or 2 (doc recommends 2).
         * @refer https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1558163#byteplusasr
         */
        StreamMode: number;
        /**
         * @brief Secondary recognition on full sentences when StreamMode is 2 (ASR 2.0).
         */
        enable_nonstream?: boolean;
      };
    };
    /**
     * @brief Google Cloud Speech-to-Text API v1 (`ASRConfig.Provider` = `Google`).
     * @note `CredentialsJSON` (if present) is injected by the server. See `Server/sensitive.js` → `VOICE_CHAT_MODE.ASRConfig.Google`.
     * @refer https://cloud.google.com/speech-to-text/docs
     */
    [Provider.GoogleAsrV1]: {
      Provider: 'Google';
      ProviderParams: {
        /**
         * @brief Recognition locale (BCP-47), e.g. `yue-Hant-HK`.
         * @refer https://cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages
         */
        Language: string;
        /**
         * @brief Recognition model id (e.g. `latest_long`).
         * @refer https://cloud.google.com/speech-to-text/docs/models/chirp
         */
        Model: string;
        /**
         * @brief Google service account JSON for authentication.
         * @note Injected by server, refer to Server/sensitive.js.
         * @refer https://cloud.google.com/docs/authentication/application-default-credentials#GAC
         */
        CredentialsJSON?: string;
      };
    };
    /**
     * @brief Google Cloud Speech-to-Text API v2 (`ASRConfig.Provider` = `GoogleV2`).
     * @note `CredentialsJSON` / `RecognizerPath` (if present) are injected by the server. See `Server/sensitive.js` → `VOICE_CHAT_MODE.ASRConfig.GoogleV2`.
     * @refer https://cloud.google.com/speech-to-text/v2/docs
     */
    [Provider.GoogleAsrV2]: {
      Provider: 'GoogleV2';
      ProviderParams: {
        /**
         * @brief BCP-47 language codes; v2 accepts one or more locales.
         * @refer https://cloud.google.com/speech-to-text/v2/docs/speech-to-text-supported-languages
         */
        LanguageCodes: string[];
        /**
         * @brief Recognition model id (e.g. `latest_long`).
         * @refer https://cloud.google.com/speech-to-text/v2/docs/chirp-model
         */
        Model: string;
        /**
         * @brief Fully qualified recognizer resource name (`projects/.../locations/.../recognizers/...`).
         * @note Injected by server when required; refer to Server/sensitive.js.
         */
        RecognizerPath?: string;
        /**
         * @brief Google service account JSON for authentication.
         * @note Injected by server, refer to Server/sensitive.js.
         */
        CredentialsJSON?: string;
      };
    };
  };

  constructor() {
    this.provider = Provider.Byteplus;
    this.#paramsMap = {
      [Provider.Amazon]: {
        Provider: Provider.Amazon,
        ProviderParams: {
          Region: 'us-west-2',
          Language: 'en-US',
        },
      },
      [Provider.Byteplus]: {
        Provider: 'BytePlus',
        ProviderParams: {
          Mode: 'SeedASR',
          StreamMode: 0,
          Language: 'zh-CN',
        },
      },
      [Provider.GoogleAsrV1]: {
        Provider: 'Google',
        ProviderParams: {
          Language: 'en-US',
          Model: 'latest_long',
        },
      },
      [Provider.GoogleAsrV2]: {
        Provider: 'GoogleV2',
        ProviderParams: {
          LanguageCodes: ['en-US'],
          Model: 'latest_long',
        },
      },
    };
  }

  get value() {
    switch (this.provider) {
      case Provider.Byteplus: {
        const bp = this.#paramsMap[this.provider].ProviderParams;
        bp.ApiResourceId =
          this.seedAsrVersion === '2.0'
            ? 'volc.seedasr.sauc.duration'
            : 'volc.bigasr.sauc.duration';
        if (this.seedAsrVersion === '2.0') {
          bp.StreamMode = 2;
          bp.enable_nonstream = true;
        } else {
          bp.StreamMode = 0;
          delete bp.enable_nonstream;
        }
        return this.#paramsMap[this.provider];
      }
      default:
        return this.#paramsMap[this.provider] || {};
    }
  }
}
