/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const fetch = require('node-fetch');
const { signQuery } = require('./signing');
const { preflight } = require('./preflight');
const { validateProviderConfig } = require('./providerConfig');
const { injectSensitiveInfo } = require('./sensitive');
const { isVoiceChatMode, generateRtcAccessToken } = require('./util');

function createManualRuntime(config, { env, fetchImpl = fetch, probeSpeech, signal }) {
  function check(action, body) {
    return preflight(action, body, env, { validate: validateProviderConfig, probe: probeSpeech });
  }

  function prepare(action, body) {
    validateProviderConfig(action, body, env);
    injectSensitiveInfo(body, isVoiceChatMode(action), { action, env });
  }

  function issueToken({ appID, roomID, userID }) {
    return generateRtcAccessToken({ appID, roomID, userID, appKey: config.appKey });
  }

  async function invoke(action, body) {
    const openApiRequestDataRTC = {
      region: 'ap-southeast-1',
      method: 'POST',
      params: {
        Action: action,
        Version: '2025-05-01',
      },
      headers: {
        Host: 'rtc.ap-southeast-1.byteplusapi.com',
        'Content-Type': 'application/json',
      },
    };
    const rtcSignedUri = `https://rtc.ap-southeast-1.byteplusapi.com?${signQuery(openApiRequestDataRTC, 'rtc', config.credential)}`;

    /** Refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-69828 to get more information. */
    const result = await fetchImpl(rtcSignedUri, {
      method: 'POST',
      headers: openApiRequestDataRTC.headers,
      body: JSON.stringify(body),
      timeout: 5000,
      signal,
    });
    if (result.ok === false) throw new Error(`RTC OpenAPI returned HTTP ${result.status}`);
    return result.json();
  }

  return { check, prepare, issueToken, invoke };
}

module.exports = { createManualRuntime };
