/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { FlexibleAPIs, RealtimeAPIs, BasicAPIs } from './api';
import { generateAPIs, isRealTimeCallMode } from './base';

/**
 * @brief Actions
 */
export enum ACTIONS {
  StartVoiceChat = 'StartVoiceChat',
  // UpdateVoiceChat = '',
  StopVoiceChat = 'StopVoiceChat',
  GenerateRtcAccessToken = 'GenerateRtcAccessToken',
}

/**
 * @brief Normalization APIs
 */
export default {
  [ACTIONS.StartVoiceChat]: (...params: unknown[]) => {
    return isRealTimeCallMode()
      ? generateAPIs(RealtimeAPIs).StartVoiceChatWithRealtimeAPI(...params)
      : generateAPIs(FlexibleAPIs).StartVoiceChat(...params);
  },
  [ACTIONS.StopVoiceChat]: (...params: unknown[]) => {
    return isRealTimeCallMode()
      ? generateAPIs(RealtimeAPIs).StopVoiceChatWithRealtimeAPI(...params)
      : generateAPIs(FlexibleAPIs).StopVoiceChat(...params);
  },
  [ACTIONS.GenerateRtcAccessToken]: (...params: unknown[]) => {
    return generateAPIs(BasicAPIs).generateRtcAccessToken(...params);
  },
};
