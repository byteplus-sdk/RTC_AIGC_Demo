/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { OPENAI_VOICE_TYPE } from '../voiceChat/tts';

/**
 * @brief Realtime Mode (OpenAI Realtime) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316255
 *       Some sensitive fields not provided in frontend were injected by the server (See: Server/sensitive.js).
 */
export class LLMManager {
  voiceType = OPENAI_VOICE_TYPE.ALLOY;

  systemMessages = '';

  get value(): {
    Provider: 'openai';
    /**
     * @note Injected by server, refer to Server/sensitive.js.
     * @refer https://platform.openai.com/api-keys
     */
    Token?: string;
    Voice: OPENAI_VOICE_TYPE;
    Instructions?: string;
    Temperature?: number;
    MaxResponseOutputTokens?: number;
    TurnDetection?: {
      Type?: string;
      Threshold?: number;
      PrefixPaddingMs?: number;
      SilenceDurationMs?: number;
    };
  } {
    return {
      Provider: 'openai',
      Voice: this.voiceType,
      Instructions: this.systemMessages,
    };
  }
}
