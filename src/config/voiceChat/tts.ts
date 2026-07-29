/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider } from '../basic';
import { createIsEnumType } from '@/utils/type';
import type { SeedVersion } from './seedVersion';

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
 * @brief BytePlus Seed TTS 2.0 voice types (uranus_bigtts).
 * @refer https://docs.byteplus.com/en/docs/byteplusvoice/voicelist
 */
export enum BYTE_PLUS_TTS_2_VOICE_TYPE {
  Vivi = 'zh_female_vv_uranus_bigtts',
  Mindy = 'zh_female_xiaohe_uranus_bigtts',
  Stokie = 'en_female_stokie_uranus_bigtts',
  Dacey = 'en_female_dacey_uranus_bigtts',
  Tim = 'en_male_tim_uranus_bigtts',
  Kian = 'zh_male_m191_uranus_bigtts',
  Cedric = 'zh_male_taocheng_uranus_bigtts',
  Sophie = 'zh_male_sophie_uranus_bigtts',
  Jean = 'zh_female_yingyujiaoxue_uranus_bigtts',
  Magnus = 'zh_male_dayi_uranus_bigtts',
  Mabel = 'zh_female_mizai_uranus_bigtts',
  Nadia = 'zh_female_jitangnv_uranus_bigtts',
  Opal = 'zh_female_meilinvyou_uranus_bigtts',
  Pearl = 'zh_female_liuchangnv_uranus_bigtts',
  Quentin = 'zh_male_ruyayichen_uranus_bigtts',
  Vienna = 'zh_female_vivo_uranus_bigtts',
  Alina = 'zh_female_xiaoai_uranus_bigtts',
  Corinne = 'zh_female_cancan_uranus_bigtts',
  Esther = 'zh_female_tianmeixiaoyuan_uranus_bigtts',
  Freya = 'zh_female_tianmeitaozi_uranus_bigtts',
  Gigi = 'zh_female_shuangkuaisisi_uranus_bigtts',
  Holly = 'zh_female_peiqi_uranus_bigtts',
  Lyla = 'zh_female_xiaoxue_uranus_bigtts',
  Daisy = 'zh_female_yuanqi_uranus_bigtts',
  Tracy = 'zh_female_kefunvsheng_uranus_bigtts',
  Jess = 'zh_male_shaonianzixin_uranus_bigtts',
  Pinky = 'zh_female_linjianvhai_uranus_bigtts',
  Sandy = 'zh_female_sajiaoxuemei_uranus_bigtts',
  Bonnie = 'zh_female_dabing_uranus_bigtts',
  Felix = 'zh_male_liufei_uranus_bigtts',
  Celeste = 'zh_female_qingxinnvsheng_uranus_bigtts',
  'Monkey King' = 'zh_male_sunwukong_uranus_bigtts',
  Minimi = 'jp_female_minimi_uranus_bigtts',
  Sweety = 'zh_female_kiwi_uranus_bigtts',
  '지훈' = 'kr_male_shane_uranus_bigtts',
  Han = 'id_male_han_uranus_bigtts',
  Felipe = 'es_male_felipe_uranus_bigtts',
  Martins = 'pt_male_martins_uranus_bigtts',
  Usseau = 'fr_male_usseau_uranus_bigtts',
  Sven = 'de_male_seven_uranus_bigtts',
  Enzo = 'it_male_enzo_uranus_bigtts',
}

export const isByteplusTts2Voice = (voiceType: string) => voiceType.endsWith('_uranus_bigtts');

export const getSeedTtsVersionFromVoice = (voiceType: IVoiceType): SeedVersion =>
  typeof voiceType === 'string' && isByteplusTts2Voice(voiceType) ? '2.0' : '1.0';

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

/**
 * @brief Google Cloud Text-to-Speech Chirp3 HD voices (`{locale}-Chirp3-HD-{Name}`), aligned with rtc-aigc-demo PRD.
 * @refer https://cloud.google.com/text-to-speech/docs/chirp3-hd
 */
export enum GOOGLE_VOICE_TYPE {
  Aoede = 'en-US-Chirp3-HD-Aoede',
  Kore = 'en-US-Chirp3-HD-Kore',
  Leda = 'en-US-Chirp3-HD-Leda',
  Charon = 'en-US-Chirp3-HD-Charon',
  Fenrir = 'en-US-Chirp3-HD-Fenrir',
  Puck = 'en-US-Chirp3-HD-Puck',
  Zephyr = 'en-US-Chirp3-HD-Zephyr',
}

export const VoiceMap = {
  [Provider.Byteplus]: BYTE_PLUS_VOICE_TYPE,
  [Provider.OpenAI]: OPENAI_VOICE_TYPE,
  [Provider.Amazon]: AMAZON_VOICE_TYPE,
  [Provider.Google]: GOOGLE_VOICE_TYPE,
};

export type IVoiceType =
  | BYTE_PLUS_VOICE_TYPE
  | BYTE_PLUS_TTS_2_VOICE_TYPE
  | OPENAI_VOICE_TYPE
  | AMAZON_VOICE_TYPE
  | GOOGLE_VOICE_TYPE;

/**
 * @brief Flexible Mode (VoiceChat Mode) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316243
 *       Some sensitive fields not provided in frontend were injected by the server (See: Server/sensitive.js).
 */
export class TTSManager {
  provider: Provider.Byteplus | Provider.Amazon | Provider.OpenAI | Provider.Google =
    Provider.Byteplus;

  /** Seed TTS 1.0 vs 2.0 (default 2.0). */
  seedTtsVersion: SeedVersion = '2.0';

  voiceType: IVoiceType = BYTE_PLUS_TTS_2_VOICE_TYPE.Pearl;

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
          voice_type: BYTE_PLUS_VOICE_TYPE | BYTE_PLUS_TTS_2_VOICE_TYPE;
        };
        resourceId: 'volc.service_type.1000009' | 'seed-tts-2.0';
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
    [Provider.Google]: {
      /** @note rtc-aigc-demo / BytePlus Voice Chat expect PascalCase `Google`, not enum `google`. */
      Provider: 'Google';
      ProviderParams: {
        VoiceSelection: {
          LanguageCode: string;
          Name: string;
        };
        StreamingAudioConfig: {
          SampleRateHertz: number;
          SpeakingRate: number;
        };
      };
      IgnoreBracketText: number[];
    };
  };

  constructor() {
    this.#paramsMap = {
      [Provider.Byteplus]: {
        Provider: 'byteplus_Bidirectional_streaming',
        ProviderParams: {
          app: {},
          audio: {
            voice_type: BYTE_PLUS_TTS_2_VOICE_TYPE.Pearl,
          },
          resourceId: 'seed-tts-2.0',
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
      [Provider.Google]: {
        Provider: 'Google',
        ProviderParams: {
          VoiceSelection: {
            LanguageCode: 'en-US',
            Name: VoiceMap[Provider.Google].Aoede,
          },
          StreamingAudioConfig: {
            SampleRateHertz: 24000,
            SpeakingRate: 1.0,
          },
        },
        IgnoreBracketText: [1, 2],
      },
    };
  }

  get value() {
    switch (this.provider) {
      case Provider.Byteplus: {
        const bp = this.#paramsMap[this.provider].ProviderParams;
        bp.resourceId =
          this.seedTtsVersion === '2.0' ? 'seed-tts-2.0' : 'volc.service_type.1000009';
        if (bp.audio) {
          const isTts1 =
            createIsEnumType(BYTE_PLUS_VOICE_TYPE)(this.voiceType) && this.seedTtsVersion === '1.0';
          const isTts2 =
            createIsEnumType(BYTE_PLUS_TTS_2_VOICE_TYPE)(this.voiceType) &&
            this.seedTtsVersion === '2.0';
          if (isTts1 || isTts2) {
            bp.audio.voice_type = this.voiceType as BYTE_PLUS_VOICE_TYPE;
          }
        }
        break;
      }
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
      case Provider.Google: {
        const g = this.#paramsMap[this.provider].ProviderParams;
        const name = String(this.voiceType);
        g.VoiceSelection.Name = name;
        const chirp = '-Chirp3-HD-';
        const i = name.indexOf(chirp);
        g.VoiceSelection.LanguageCode =
          i >= 0 ? name.slice(0, i) : g.VoiceSelection.LanguageCode || 'en-US';
        break;
      }
      default:
        break;
    }
    return this.#paramsMap[this.provider] || {};
  }
}
