/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('koa2-cors');
const { Signer } = require('@byteplus/vcloud-sdk-nodejs');
const fetch = require('node-fetch');
const { isGoogleLlm } = require('./providerConfig');
const { createAgentLifecycle } = require('./agentLifecycle');
if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
}
const { injectSensitiveInfo } = require('./sensitive');
const { isVoiceChatMode, generateRtcAccessToken } = require('./util');

const AGENT_ACTIONS = new Set([
  'StartVoiceChat', 'StopVoiceChat',
  'StartVoiceChatWithRealtimeAPI', 'StopVoiceChatWithRealtimeAPI',
]);

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function loadConfig(env = process.env) {
  if (Boolean(env.BYTEPLUS_ACCESS_KEY_ID?.trim()) !== Boolean(env.BYTEPLUS_SECRET_ACCESS_KEY?.trim())) {
    throw new Error('BYTEPLUS_ACCESS_KEY_ID and BYTEPLUS_SECRET_ACCESS_KEY must be set together');
  }
  const port = Number(env.SERVER_PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SERVER_PORT must be an integer between 1 and 65535');
  }
  return {
    appId: required(env.RTC_APP_ID, 'RTC_APP_ID'),
    appKey: required(env.RTC_APP_KEY, 'RTC_APP_KEY'),
    credential: {
      accessKeyId: required(env.BYTEPLUS_ACCESS_KEY_ID, 'BYTEPLUS_ACCESS_KEY_ID'),
      secretKey: required(env.BYTEPLUS_SECRET_ACCESS_KEY, 'BYTEPLUS_SECRET_ACCESS_KEY'),
    },
    port,
  };
}

function validateProviderConfig(action, body, env) {
  if (!action.startsWith('Start')) return;
  const fields = [];
  const speech = ['BYTEPLUS_SEED_SPEECH_APP_ID', 'BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN'];
  const amazon = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const google = ['GOOGLE_CREDENTIALS_JSON'];
  if (isVoiceChatMode(action)) {
    const config = body?.Config;
    fields.push(...({
      BytePlus: speech, amazon, google, Google: google,
      GoogleV2: [...google, 'GOOGLE_RECOGNIZER_PATH'],
    }[config?.ASRConfig?.Provider] || []));
    fields.push(...({
      BytePlus: speech, byteplus_Bidirectional_streaming: speech, amazon, Google: google,
      openai: ['OPENAI_API_KEY'],
    }[config?.TTSConfig?.Provider] || []));
    if (config?.LLMConfig?.Mode === 'BytePlusArk') fields.push('BYTEPLUS_MODEL_API_KEY');
    if (config?.LLMConfig?.Mode === 'CustomLLM') {
      if (isGoogleLlm(config.LLMConfig)) fields.push('GOOGLE_LLM_API_KEY');
      else required(env.CUSTOM_LLM_API_KEY || env.OPENAI_API_KEY, 'CUSTOM_LLM_API_KEY or OPENAI_API_KEY');
    }
    if (config?.WebSearchAgentConfig?.Enable === true) fields.push('ASKECHO_API_KEY');
  } else {
    fields.push('OPENAI_API_KEY');
  }
  const avatar = isVoiceChatMode(action) ? body?.Config?.AvatarConfig : body?.AvatarConfig;
  if (avatar?.Enabled) {
    fields.push(...(avatar.Provider === 'Akool' ? ['AKOOL_API_KEY'] : ['AVATAR_APP_ID', 'AVATAR_TOKEN']));
  }
  for (const field of new Set(fields)) required(env[field], field);
}

function createApp({ fetchImpl = fetch, env = process.env } = {}) {
  const config = loadConfig(env);
  const app = new Koa();
  const controller = new AbortController();
  const lifecycle = createAgentLifecycle(async (action, body) => {
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
    const rtcSignedUri = `https://rtc.ap-southeast-1.byteplusapi.com?${rtcSigner.getSignUrl(config.credential)}`;

    /** Refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-69828 to get more information. */
    const result = await fetchImpl(rtcSignedUri, {
      method: 'POST',
      headers: openApiRequestDataRTC.headers,
      body: JSON.stringify(body),
      timeout: 5000,
      signal: controller.signal,
    });
    if (result.ok === false) throw new Error(`RTC OpenAPI returned HTTP ${result.status}`);
    return result.json();
  });
  app.stopActiveAgents = lifecycle.stop;
  app.abortAgentRequests = () => controller.abort();

  app.use(
    cors({
      origin: '*',
    })
  );

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      ctx.status = error.status || 502;
      ctx.body = {
        ResponseMetadata: {
          Action: ctx.request.query.action,
          Error: { Code: 'LocalProxyError', Message: error.message },
        },
        Result: error.message,
      };
    }
  });

  app.use(bodyParser());

  app.use(async (ctx) => {
    if (ctx.method === 'GET' && ctx.path === '/runtimeConfig') {
      ctx.body = { Result: { appId: config.appId } };
      return;
    }

    /**
     * @brief Proxy OpenAPI requests for AIGC.
     */
    if (ctx.path === '/proxyAIGCFetch' && ctx.method === 'POST') {
      const body = ctx.request.body;
      const action = ctx.request.query.action;

      if (!AGENT_ACTIONS.has(action)) ctx.throw(400, `unsupported action ${action}`);
      validateProviderConfig(action, body, env);

      /**
       * @brief If OpenAPI invoked in the client like website, advised to generate session token for security.
       *        OpenAPI invoked in server side in this example, not necessary to generate session token.
       */
      // await getSessionToken();

      /** Injecting the sensitive info to request body */
      injectSensitiveInfo(body, isVoiceChatMode(action));

      ctx.body = await lifecycle.request(action, body);
      return;
    }

    /**
     * @brief Generate RTC access token for room authentication
     */
    if (ctx.path === '/generateRtcAccessToken' && ctx.method === 'POST') {
      const Action = ctx.request.query.action;
      const { appID, roomID, userID } = ctx.request.body || {};
      const ResponseMetadata = { Action };

      /** Validate required parameters */
      if (![appID, roomID, userID].every((value) => typeof value === 'string' && value.trim())) {
        ctx.throw(400, 'appID, roomID and userID are required');
      }
      if (appID !== config.appId) ctx.throw(400, 'appID does not match RTC_APP_ID');
      const accessToken = generateRtcAccessToken({ appID, appKey: config.appKey, roomID, userID });
      ctx.body = {
        ResponseMetadata,
        Result: {
          token: accessToken,
        },
      };
      return;
    }

    ctx.status = 404;
    ctx.body = { Result: 'Not Found' };
  });

  return app;
}

function startServer(options = {}) {
  const { port } = loadConfig(options.env);
  const app = createApp(options);
  const server = app.listen(port, () => {
    console.log(`AIGC Server is running at http://localhost:${port}`);
  });
  let stopping;
  const onSignal = () => {
    server.stop().catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  };
  server.stop = () => {
    if (stopping) return stopping;
    const cleanup = app.stopActiveAgents();
    const closed = new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    const deadline = setTimeout(() => {
      app.abortAgentRequests();
      server.closeAllConnections();
    }, 15000);
    deadline.unref();
    stopping = Promise.allSettled([cleanup, closed]).then((results) => {
      clearTimeout(deadline);
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      const failure = results.find((result) => result.status === 'rejected');
      if (failure) throw failure.reason;
    });
    return stopping;
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, loadConfig, startServer, validateProviderConfig };
