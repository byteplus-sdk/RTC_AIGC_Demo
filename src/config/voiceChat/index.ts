/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { LLMManager } from './llm';
import { ASRManager } from './asr';
import { TTSManager } from './tts';
import { AvatarManager } from './avatar';
import { ModuleType, Provider } from '../basic';

/**
 * @brief Flexible Mode (VoiceChat Mode) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316243
 */
export class VoiceChatManager {
  llm: LLMManager;

  asr: ASRManager;

  tts: TTSManager;

  avatar: AvatarManager;

  constructor() {
    this.llm = new LLMManager();
    this.asr = new ASRManager();
    this.tts = new TTSManager();
    this.avatar = new AvatarManager();
  }

  setProvider(module: ModuleType, provider: Provider) {
    this[module].provider = provider;
  }

  set voice(value: typeof this.tts.voiceType) {
    this.tts.voiceType = value;
  }

  get voice() {
    return this.tts.voiceType;
  }

  set endPointId(value: string) {
    this.llm.endPointId = value;
  }

  get endPointId() {
    return this.llm.endPointId;
  }

  set avatarRoleId(value: string) {
    this.avatar.avatarRoleId = value;
  }

  get avatarRoleId() {
    return this.avatar.avatarRoleId;
  }

  set systemMessages(value: string[]) {
    this.llm.systemMessages = value || [];
  }

  get config() {
    return {
      Config: {
        LLMConfig: this.llm.value,
        ASRConfig: this.asr.value,
        TTSConfig: this.tts.value,
        AvatarConfig: this.avatar.value,
        SubtitleConfig: {
          SubtitleMode: this.avatar.value.Enabled ? 1 : 0,
        },
      },
    };
  }
}
