/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

/**
 * @brief Basic APIs
 */
export const BasicAPIs = [
  {
    name: 'generateRtcAccessToken',
    apiPath: '/generateRtcAccessToken',
    method: 'post',
  },
];

/**
 * @brief Flexible APIs
 */
export const FlexibleAPIs = [
  {
    name: 'StartVoiceChat',
    apiPath: '/proxyAIGCFetch',
    method: 'post',
  },
  {
    name: 'StopVoiceChat',
    apiPath: '/proxyAIGCFetch',
    method: 'post',
  },
];

/**
 * @brief Realtime APIs
 */
export const RealtimeAPIs = [
  {
    name: 'StartVoiceChatWithRealtimeAPI',
    apiPath: '/proxyAIGCFetch',
    method: 'post',
  },
  {
    name: 'StopVoiceChatWithRealtimeAPI',
    apiPath: '/proxyAIGCFetch',
    method: 'post',
  },
];
