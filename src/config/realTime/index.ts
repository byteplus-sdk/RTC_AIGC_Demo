/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { OPENAI_VOICE_TYPE } from '../voiceChat/tts';
import { AvatarManager } from '../voiceChat/avatar';
import { LLMManager } from './llm';
import { ModuleType, Provider } from '../basic';

/**
 * @brief RealTime Mode Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316255
 *       Digital human (`AvatarConfig`) is optional on `StartVoiceChatWithRealtimeAPI`, same as rtc-aigc-demo.
 */
export class RealTimeConfig {
  llm: LLMManager;

  avatar: AvatarManager;

  constructor() {
    this.llm = new LLMManager();
    this.avatar = new AvatarManager();
  }

  setProvider(module: ModuleType, provider: Provider) {
    if (module === ModuleType.Avatar) {
      this.avatar.provider = provider as AvatarManager['provider'];
    }
  }

  set voice(value: OPENAI_VOICE_TYPE) {
    this.llm.voiceType = value;
  }

  get voice() {
    return this.llm.voiceType;
  }

  set systemMessages(value: string[]) {
    /** Realtime only receive one message. */
    this.llm.systemMessages = value?.[0] || '';
  }

  set avatarRoleId(value: string) {
    this.avatar.avatarRoleId = value;
  }

  get avatarRoleId() {
    return this.avatar.avatarRoleId;
  }

  get config() {
    const base = {
      LLMConfig: this.llm.value,
    };
    if (this.avatar.provider !== Provider.None) {
      return {
        ...base,
        AvatarConfig: this.avatar.value,
      };
    }
    return base;
  }
}
