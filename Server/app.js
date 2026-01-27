/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('koa2-cors');
const { Signer } = require('@byteplus/vcloud-sdk-nodejs');
const fetch = require('node-fetch');
const { ACCOUNT_INFO, RTC_APP_KEY, injectSensitiveInfo } = require('./sensitive');
const { isVoiceChatMode, generateRtcAccessToken } = require('./util');

const app = new Koa();

app.use(
  cors({
    origin: '*',
  })
);

app.use(bodyParser());

app.use(async (ctx) => {
  /**
   * @brief Proxy OpenAPI requests for AIGC.
   */
  if (ctx.url.startsWith('/proxyAIGCFetch') && ctx.method.toLowerCase() === 'post') {
    const body = ctx.request.body;
    const action = ctx.request.query.action;

    /**
     * @brief If OpenAPI invoked in the client like website, advised to generate session token for security.
     *        OpenAPI invoked in server side in this example, not necessary to generate session token.
     */
    // await getSessionToken();

    /** Injecting the sensitive info to request body */
    injectSensitiveInfo(body, isVoiceChatMode(action));

    /** Refer to https://www.npmjs.com/package/@byteplus/vcloud-sdk-nodejs to get more information. */
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
    const rtcSigner = new Signer(openApiRequestDataRTC, 'rtc');
    const rtcSignedUri = `https://rtc.ap-southeast-1.byteplusapi.com?${rtcSigner.getSignUrl(ACCOUNT_INFO)}`;

    /** Refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-69828 to get more information. */
    const result = await fetch(rtcSignedUri, {
      method: 'POST',
      headers: openApiRequestDataRTC.headers,
      body: JSON.stringify(body),
    });
    const response = await result.json();
    ctx.body = response;
    return;
  }

  /**
   * @brief Generate RTC access token for room authentication
   */
  if (ctx.url.startsWith('/generateRtcAccessToken') && ctx.method.toLowerCase() === 'post') {
    const Action = ctx.request.query.action;
    const { appID, roomID, userID } = ctx.request.body;
    const accessToken = generateRtcAccessToken({ appID, appKey: RTC_APP_KEY, roomID, userID });
    const ResponseMetadata = { Action };

    /** Validate required parameters */
    if (!appID || !RTC_APP_KEY || !roomID || !userID) {
      ctx.body = {
        ResponseMetadata,
        Msg: 'GenerateRtcAccessToken failed',
      };
      return;
    }
    ctx.body = {
      ResponseMetadata,
      Result: {
        token: accessToken,
      },
    };
    return;
  }

  ctx.body = '<h1>404 Not Found</h1>';
});

app.listen(3001, () => {
  console.log('AIGC Server is running at http://localhost:3001');
});
