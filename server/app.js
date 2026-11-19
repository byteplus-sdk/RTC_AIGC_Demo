/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('koa2-cors');
if (require.main === module) {
  require('dotenv').config({ path: process.env.DEMO_ENV_FILE || require('path').resolve(__dirname, '../.env.local') });
}

const { createManualRuntime } = require('./manualRuntime');
const { createAgentLifecycle } = require('./agentLifecycle');
const { loadConfig } = require('./config');
const AGENT_ACTIONS = new Set([
  'StartVoiceChat', 'StopVoiceChat',
  'StartVoiceChatWithRealtimeAPI', 'StopVoiceChatWithRealtimeAPI',
]);

function createApp({ fetchImpl, env = process.env, probeSpeech } = {}) {
  const config = loadConfig(env);
  const app = new Koa();
  const controller = new AbortController();
  const runtime = createManualRuntime(config, { env, fetchImpl, probeSpeech, signal: controller.signal });
  const lifecycle = createAgentLifecycle(runtime.invoke);
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
    if (ctx.method === 'GET' && ctx.path === '/health') {
      ctx.body = { ok: true };
      return;
    }
    if (ctx.method === 'POST' && ctx.path === '/preflight') {
      const action = ctx.request.query.action;
      if (!AGENT_ACTIONS.has(action) || !action.startsWith('Start')) ctx.throw(400, 'unsupported preflight action');
      ctx.body = await runtime.check(action, ctx.request.body);
      return;
    }
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
      runtime.prepare(action, body);
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
      const accessToken = await runtime.issueToken({ appID, roomID, userID });
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
  const { port, host } = loadConfig(options.env);
  const app = createApp(options);
  const server = app.listen(port, host, () => {
    const url = `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
    console.log(`API ready: ${url}`);
    console.log(`Health: ${url}/health`);
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

module.exports = { createApp, loadConfig, startServer };
