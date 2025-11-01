/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider } from '../basic';

/**
 * @brief Flexible Mode (VoiceChat Mode) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316243
 *       Some sensitive fields not provided in frontend were injected by the server (See: Server/sensitive.js).
 */
export class ASRManager {
  provider: Provider.Amazon | Provider.Google | Provider.Byteplus;

  #paramsMap: {
    [Provider.Amazon]: {
      Provider: Provider.Amazon | Provider.Google;
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
    [Provider.Google]: {
      /**
       * @refer https://cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages?_gl=1*fvvdba*_up*MQ..&gclid=Cj0KCQiAoJC-BhCSARIsAPhdfShixYZAER8RJaVCJ161wYklfPL8dKNOw3Q_ODbdFw_gN1AEloZXus4aAlUWEALw_wcB&gclsrc=aw.ds
       */
      Language?: string;
      /**
       * @note Injected by server, refer to Server/sensitive.js.
       * @refer https://cloud.google.com/docs/authentication/application-default-credentials#GAC
       */
      CredentialsJSON?: string;
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
        Language?: 'zh-CN' | 'en-US' | 'ja-JP';
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
         * @refer https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1558163#byteplusasr
         */
        StreamMode: number;
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
      [Provider.Google]: {
        Language: 'en-US',
      },
      [Provider.Byteplus]: {
        Provider: 'BytePlus',
        ProviderParams: {
          Mode: 'SeedASR',
          StreamMode: 1,
          Language: 'ja-JP',
        },
      },
    };
  }

  get value() {
    return this.#paramsMap[this.provider] || {};
  }
}
