/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { ConfigFactory } from './config';
import { CALL_TYPE } from '@/app/base';
import { Provider } from './basic';
import { BYTE_PLUS_VOICE_TYPE } from './voiceChat/tts';
import OpenAiSVG from '@/assets/img/OpenAI.svg';
import GoogleSVG from '@/assets/img/Google.svg';
import AmazonSVG from '@/assets/img/Amazon.svg';
import ArkSVG from '@/assets/img/Ark.svg';

export const getEnvDomain = () => 'http://localhost:3001';

export const AIGC_PROXY_HOST = getEnvDomain();

export const VendorSVG = {
  [Provider.Amazon]: AmazonSVG,
  [Provider.Google]: GoogleSVG,
  [Provider.OpenAI]: OpenAiSVG,
  [Provider.Byteplus]: ArkSVG,
};

export const ArkVoiceDescription: Partial<Record<BYTE_PLUS_VOICE_TYPE, string>> = {
  [BYTE_PLUS_VOICE_TYPE.Luna]: 'English & Chinese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Edward]: 'Chinese, Audio Book Scene',
  [BYTE_PLUS_VOICE_TYPE.Emma]: 'Chinese, Audio Book Scene',
  [BYTE_PLUS_VOICE_TYPE.Anna]: 'English, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Olivia]: 'English & Chinese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Lily]: 'English & Chinese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Tina]: 'English & Chinese, Dubbing Scene',
  [BYTE_PLUS_VOICE_TYPE.William]: 'English & Chinese, Dubbing Scene',
  [BYTE_PLUS_VOICE_TYPE.James]: 'English & Chinese, Dubbing Scene',
  [BYTE_PLUS_VOICE_TYPE.Grace]: 'English & Chinese, Dubbing Scene',
  [BYTE_PLUS_VOICE_TYPE.Sophia]: 'English & Chinese, Dubbing Scene',
  [BYTE_PLUS_VOICE_TYPE.Mia]: 'English & Chinese, Dubbing Scene',
  [BYTE_PLUS_VOICE_TYPE.Ava]: 'English & Chinese, Dubbing Scene',
  [BYTE_PLUS_VOICE_TYPE.Adam]: 'American English, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Sarah]: 'American English, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Dryw]: 'American English, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Smith]: 'British English, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Isabella]: 'Chinese - Taiwanese Accent, Fun Scene',
  [BYTE_PLUS_VOICE_TYPE.Andrew]: 'Chinese - Cantonese Accent, Fun Scene',
  [BYTE_PLUS_VOICE_TYPE.Charlotte]: 'Chinese, Role Scene',
  [BYTE_PLUS_VOICE_TYPE.Robert]: 'Chinese - Cantonese Accent, Fun Scene',
  [BYTE_PLUS_VOICE_TYPE.Thomas]: 'Chinese - Beijing Accent, Fun Scene',
  [BYTE_PLUS_VOICE_TYPE.Mark]: 'English & Chinese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Lila]: 'Chinese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Ethan]: 'English & Chinese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Joseph]: 'Chinese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Elena]: 'Chinese - Sichuan Accent, Fun Scene',
  [BYTE_PLUS_VOICE_TYPE.George]: 'Chinese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.かずね]: 'Japanese & Spanish, General Scene',
  [BYTE_PLUS_VOICE_TYPE.はるこ]: 'Japanese & Spanish, General Scene',
  [BYTE_PLUS_VOICE_TYPE.あけみ]: 'Japanese, General Scene',
  [BYTE_PLUS_VOICE_TYPE.ひろし]: 'Japanese & Spanish, General Scene',
  [BYTE_PLUS_VOICE_TYPE.Aria]: 'English & Chinese, General Scene',
};

export enum CustomParamsType {
  TTS = 'TTS',
  ASR = 'ASR',
  LLM = 'LLM',
}

/**
 * @brief Model Prompt
 */
export enum PROMPT {
  DEFAULT = 'ユーザーの質問に簡潔に答える。長さは30文字内に収める',
}

export const ModeOptions = {
  [CALL_TYPE.VOICE_CHAT]: 'Flexible combination',
  [CALL_TYPE.REAL_TIME]: "OpenAI's Realtime API",
};

export const VendorName = {
  [Provider.Amazon]: 'Amazon',
  [Provider.OpenAI]: 'OpenAI',
  [Provider.Google]: 'Google',
};

export const PopoverContent = {
  [CALL_TYPE.REAL_TIME]:
    "No need for additional ASR and TTS integration, empowered by OpenAI's RealtimeAPI.",
  [CALL_TYPE.VOICE_CHAT]: 'Flexible combination of ASR, TTS and LLM vendors.',
};

export const Questions = [
  'どのように健康を維持するのですか？',
  '物語を話していただけますか？',
  '人生の意味は何ですか？',
];

const factory = new ConfigFactory();

export default factory;
