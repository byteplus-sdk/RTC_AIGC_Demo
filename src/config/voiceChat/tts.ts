/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider } from '../basic';
import { createIsEnumType } from '@/utils/type';

/**
 * @brief Byteplus Voice Type
 * @refer https://console.byteplus.com/voice/service/1000014
 */
export enum BYTE_PLUS_VOICE_TYPE {
  Luna = 'zh_female_cancan_mars_bigtts',
  Edward = 'zh_male_baqiqingshu_mars_bigtts',
  Emma = 'zh_female_wenroushunv_mars_bigtts',
  Anna = 'en_female_anna_mars_bigtts',
  Olivia = 'zh_female_qingxinnvsheng_mars_bigtts',
  Lily = 'zh_female_linjia_mars_bigtts',
  Tina = 'zh_female_shaoergushi_mars_bigtts',
  William = 'zh_male_silang_mars_bigtts',
  James = 'zh_male_jieshuonansheng_mars_bigtts',
  Grace = 'zh_female_jitangmeimei_mars_bigtts',
  Sophia = 'zh_female_tiexinnvsheng_mars_bigtts',
  Mia = 'zh_female_qiaopinvsheng_mars_bigtts',
  Ava = 'zh_female_mengyatou_mars_bigtts',
  Adam = 'en_male_adam_mars_bigtts',
  Sarah = 'en_female_sarah_mars_bigtts',
  Dryw = 'en_male_dryw_mars_bigtts',
  Smith = 'en_male_smith_mars_bigtts',
  Isabella = 'zh_female_wanwanxiaohe_moon_bigtts',
  Andrew = 'zh_male_guozhoudege_moon_bigtts',
  Charlotte = 'zh_female_gaolengyujie_moon_bigtts',
  Robert = 'zh_female_wanqudashu_moon_bigtts',
  Thomas = 'zh_male_jingqiangkanye_moon_bigtts',
  Mark = 'zh_male_wennuanahu_moon_bigtts',
  Lila = 'zh_female_linjianvhai_moon_bigtts',
  Ethan = 'zh_male_shaonianzixin_moon_bigtts',
  Joseph = 'zh_male_yuanboxiaoshu_moon_bigtts',
  Elena = 'zh_female_daimengchuanmei_moon_bigtts',
  George = 'zh_male_yangguangqingnian_moon_bigtts',
  かずね = 'multi_male_jingqiangkanye_moon_bigtts',
  はるこ = 'multi_female_shuangkuaisisi_moon_bigtts',
  あけみ = 'multi_female_gaolengyujie_moon_bigtts',
  ひろし = 'multi_male_wanqudashu_moon_bigtts',
  Aria = 'zh_female_shuangkuaisisi_moon_bigtts',
}

/**
 * @brief OpenAI Voice Type
 * @refer https://platform.openai.com/docs/guides/text-to-speech#voice-options
 * @note Only support Alloy now.
 */
export enum OPENAI_VOICE_TYPE {
  ALLOY = 'alloy',
  // ASH = 'ash',
  // BALLAD = 'ballad',
  // CORAL = 'coral',
  // ECHO = 'echo',
  // SAGE = 'sage',
  // SHIMMER = 'shimmer',
  // VERSE = 'verse',
}

/**
 * @brief Amazon Voice Type
 * @refer https://docs.aws.amazon.com/polly/latest/dg/available-voices.html
 * @note Only support Matthew now.
 */
export enum AMAZON_VOICE_TYPE {
  MATTHEW = 'Matthew',
}

export const VoiceMap = {
  [Provider.Byteplus]: BYTE_PLUS_VOICE_TYPE,
  [Provider.OpenAI]: OPENAI_VOICE_TYPE,
  [Provider.Amazon]: AMAZON_VOICE_TYPE,
};

export type IVoiceType = BYTE_PLUS_VOICE_TYPE | OPENAI_VOICE_TYPE | AMAZON_VOICE_TYPE;

/**
 * @brief Flexible Mode (VoiceChat Mode) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316243
 *       Some sensitive fields not provided in frontend were injected by the server (See: Server/sensitive.js).
 */
export class TTSManager {
  provider: Provider.Byteplus | Provider.Amazon | Provider.OpenAI = Provider.Byteplus;

  voiceType: IVoiceType = VoiceMap[Provider.Byteplus].はるこ;

  #paramsMap: {
    [Provider.Byteplus]: {
      Provider: 'byteplus_Bidirectional_streaming';
      ProviderParams: {
        app: {
          /**
           * @note Injected by server, refer to Server/sensitive.js.
           */
          appid?: string;
          /**
           * @note Injected by server, refer to Server/sensitive.js.
           */
          token?: string;
        };
        audio: {
          /**
           * @refer https://console.byteplus.com/voice/service/1000014
           */
          voice_type: BYTE_PLUS_VOICE_TYPE;
        };
        resourceId: 'volc.service_type.1000009';
      };
    };
    [Provider.Amazon]: {
      Provider: Provider.Amazon;
      ProviderParams: {
        /**
         * @note Injected by server, refer to Server/sensitive.js.
         * @refer https://docs.aws.amazon.com/keyspaces/latest/devguide/create.keypair.html
         */
        ID?: string;
        /**
         * @note Injected by server, refer to Server/sensitive.js.
         * @refer https://docs.aws.amazon.com/keyspaces/latest/devguide/create.keypair.html
         */
        Secret?: string;
        /**
         * @refer https://docs.aws.amazon.com/polly/latest/dg/available-voices.html
         */
        VoiceID?: AMAZON_VOICE_TYPE;
        /**
         * @refer https://console.aws.amazon.com/iam/
         */
        Region: string;
        Language: 'en-US';
      };
    };
    [Provider.OpenAI]: {
      Provider: Provider.OpenAI;
      ProviderParams: {
        /**
         * @note Fixed value, `https://api.openai.com/v1/audio/speech`.
         */
        URL?: 'https://api.openai.com/v1/audio/speech';
        /**
         * @note Injected by server, refer to Server/sensitive.js.
         * @refer https://platform.openai.com/api-keys
         */
        APIKey?: string;
        /**
         * @refer https://platform.openai.com/docs/models#tts.
         */
        Model: string;
        /**
         * @refer https://platform.openai.com/docs/guides/text-to-speech#voice-options
         */
        Voice: OPENAI_VOICE_TYPE;
        Language: 'en-US';
        Region: 'us-west-2';
        Speed?: string;
      };
    };
  };

  constructor() {
    this.#paramsMap = {
      [Provider.Byteplus]: {
        Provider: 'byteplus_Bidirectional_streaming',
        ProviderParams: {
          app: {},
          audio: {
            voice_type: VoiceMap[Provider.Byteplus].はるこ,
          },
          resourceId: 'volc.service_type.1000009',
        },
      },
      [Provider.Amazon]: {
        Provider: Provider.Amazon,
        ProviderParams: {
          VoiceID: VoiceMap[Provider.Amazon].MATTHEW,
          Region: 'us-west-2',
          Language: 'en-US',
        },
      },
      [Provider.OpenAI]: {
        Provider: Provider.OpenAI,
        ProviderParams: {
          // URL: 'https://api.openai.com/v1/audio/speech',
          Model: 'tts-1',
          Voice: VoiceMap[Provider.OpenAI].ALLOY,
          Language: 'en-US',
          Region: 'us-west-2',
          Speed: '1.0',
        },
      },
    };
  }

  get value() {
    switch (this.provider) {
      case Provider.Byteplus:
        if (
          this.#paramsMap[this.provider].ProviderParams.audio &&
          createIsEnumType(BYTE_PLUS_VOICE_TYPE)(this.voiceType)
        ) {
          this.#paramsMap[this.provider].ProviderParams.audio.voice_type = this.voiceType;
        }
        break;
      case Provider.OpenAI:
        if (
          this.#paramsMap[this.provider].ProviderParams &&
          createIsEnumType(OPENAI_VOICE_TYPE)(this.voiceType)
        ) {
          this.#paramsMap[this.provider].ProviderParams.Voice = this.voiceType;
        }
        break;
      case Provider.Amazon:
        if (
          this.#paramsMap[this.provider].ProviderParams &&
          createIsEnumType(AMAZON_VOICE_TYPE)(this.voiceType)
        ) {
          this.#paramsMap[this.provider].ProviderParams.VoiceID = this.voiceType;
        }
        break;
      default:
        break;
    }
    return this.#paramsMap[this.provider] || {};
  }
}
