/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */
import { v4 as uuid } from 'uuid';
import { isRealTimeCallMode } from '@/app/base';
import { PROMPT } from '.';
import { RealTimeConfig } from './realTime';
import { VoiceChatManager } from './voiceChat';
import { ModuleType, Provider } from './basic';

import type { IVoiceType } from './voiceChat/tts';

export class ConfigFactory {
  #realTimeManager: RealTimeConfig;

  #voiceChatManager: VoiceChatManager;

  /**
   * @note AppId of the RTC
   * @refer https://docs.byteplus.com/en/docs/byteplus-rtc/docs-69865#step-3-create-a-byteplus-rtc-app-and-get-the-appid
   */
  AppId = 'Your AppId';

  /**
   * @note RTC RoomId
   *       You can use uuid() for random generation or customize it.
   */
  RoomId = uuid();

  /**
   * @note RTC UserId
   *       You can use uuid() for random generation or customize it.
   */
  UserId = uuid();

  /**
   * @note RTC Access Token
   *       You can generate it manually in the console for testing.
   *       Or leave it undefined, demo will generate it automatically by calling api (in src/lib/useCommon.ts), and this require your RTC_APP_KEY in /Server/sensitve.js.
   */
  Token = undefined;

  BotName = 'RobotMan_';

  WelcomeMessage = 'Welcome to use the virtual human model driven by BytePlus Video Cloud RTC';

  SystemMessages: string[] = [PROMPT.DEFAULT];

  constructor() {
    this.#realTimeManager = new RealTimeConfig();
    this.#voiceChatManager = new VoiceChatManager();
  }

  get #manager() {
    return isRealTimeCallMode() ? this.#realTimeManager : this.#voiceChatManager;
  }

  set 'Provider.LLM'(value: Provider) {
    if (this.#manager instanceof RealTimeConfig) {
      return;
    }
    this.#manager.setProvider(ModuleType.LLM, value);
  }

  get 'Provider.LLM'() {
    return isRealTimeCallMode() ? Provider.OpenAI : this.#voiceChatManager.llm.provider;
  }

  set 'Provider.ASR'(value: Provider) {
    if (this.#manager instanceof RealTimeConfig) {
      return;
    }
    this.#manager.setProvider(ModuleType.ASR, value);
  }

  get 'Provider.ASR'() {
    return isRealTimeCallMode() ? Provider.OpenAI : this.#voiceChatManager.asr.provider;
  }

  set 'Provider.TTS'(value: Provider) {
    if (this.#manager instanceof RealTimeConfig) {
      return;
    }
    this.#manager.setProvider(ModuleType.TTS, value);
  }

  get 'Provider.TTS'() {
    return isRealTimeCallMode() ? Provider.OpenAI : this.#voiceChatManager.tts.provider;
  }

  set 'Provider.Avatar'(value: Provider) {
    if (this.#manager instanceof RealTimeConfig) {
      return;
    }
    this.#manager.setProvider(ModuleType.Avatar, value);
  }

  get 'Provider.Avatar'() {
    return isRealTimeCallMode() ? Provider.None : this.#voiceChatManager.avatar.provider;
  }

  set voice(value: IVoiceType) {
    this.#manager.voice = value;
  }

  get voice() {
    return this.#manager.voice;
  }

  set avatar(value) {
    if (isRealTimeCallMode()) {
      return;
    }
    this.#voiceChatManager.avatarRoleId = value;
  }

  get avatar() {
    return isRealTimeCallMode() ? '' : this.#voiceChatManager.avatarRoleId;
  }

  set endPointId(value: string) {
    if (isRealTimeCallMode()) {
      return;
    }
    this.#voiceChatManager.endPointId = value;
  }

  get endPointId() {
    return isRealTimeCallMode() ? '' : this.#voiceChatManager.endPointId;
  }

  set BackgroundUrl(value: string) {
    if (isRealTimeCallMode()) {
      return;
    }
    this.#voiceChatManager.avatar.backgroundUrl = value;
  }

  get BackgroundUrl() {
    return isRealTimeCallMode() ? '' : this.#voiceChatManager.avatar.backgroundUrl;
  }

  get AvatarEnable() {
    return this.#voiceChatManager.avatar.provider !== Provider.None;
  }

  /**
   * @refer
   * - Flexible mode(VoiceChat): https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1558163
   * - Realtime mode(OpenAI): https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316257
   */
  get config() {
    this.#manager.systemMessages = this.SystemMessages;
    const params = {
      AppId: this.AppId,
      RoomId: this.RoomId,
      UserId: this.UserId,
      TaskId: this.UserId,
      AgentConfig: {
        /**
         * @note UserId of the client
         */
        TargetUserID: [this.UserId],
        /**
         * @note The name of the chat agent in the room.
         */
        UserID: this.BotName,
        WelcomeMessage: this.WelcomeMessage,
      },
      ...this.#manager.config,
    };
    return params;
  }
}
