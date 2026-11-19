/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { FlexibleAPIs, RealtimeAPIs, BasicAPIs } from './api';
import { CALL_TYPE, generateAPIs, getCallMode, isRealTimeCallMode } from './base';

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
  [ACTIONS.StopVoiceChat]: (params: unknown, mode = getCallMode()) => {
    return mode === CALL_TYPE.REAL_TIME
      ? generateAPIs(RealtimeAPIs).StopVoiceChatWithRealtimeAPI(params)
      : generateAPIs(FlexibleAPIs).StopVoiceChat(params);
  },
  [ACTIONS.GenerateRtcAccessToken]: (...params: unknown[]) => {
    return generateAPIs(BasicAPIs).generateRtcAccessToken(...params);
  },
};
