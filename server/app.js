/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const path = require('path');
const { spawn } = require('child_process');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('koa2-cors');
const dotenv = require('dotenv');
const { Signer } = require('@byteplus/vcloud-sdk-nodejs');
const fetch = require('node-fetch');
const { injectSensitiveInfo } = require('./sensitive');
const { isVoiceChatMode } = require('./util');

const START_ACTION = 'StartVoiceChat';
const STOP_ACTION = 'StopVoiceChat';
const AGENT_ACTIONS = new Set([START_ACTION, STOP_ACTION]);
const RTC_ENDPOINT = 'https://rtc.ap-southeast-1.byteplusapi.com';

function required(value, name) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function loadRuntimeConfig(env = process.env) {
  const accessKeyId = env.BYTEPLUS_ACCESS_KEY_ID?.trim();
  const secretKey = env.BYTEPLUS_SECRET_ACCESS_KEY?.trim();
  if (Boolean(accessKeyId) !== Boolean(secretKey)) {
    throw new Error('BYTEPLUS_ACCESS_KEY_ID and BYTEPLUS_SECRET_ACCESS_KEY must be set together');
  }
  const common = {
    appId: required(env.RTC_APP_ID, 'RTC_APP_ID'),
    host: env.HOST?.trim() || '127.0.0.1',
    port: Number(env.PORT || 3001),
    endpoint: env.BYTEPLUS_RTC_ENDPOINT?.trim() || RTC_ENDPOINT,
    region: env.BYTEPLUS_RTC_REGION?.trim() || 'ap-southeast-1',
    service: env.BYTEPLUS_RTC_SERVICE?.trim() || 'rtc',
    userAgent: env.BYTEPLUS_RTC_OPENAPI_USER_AGENT?.trim() || undefined,
    env,
  };
  if (!Number.isInteger(common.port) || common.port <= 0) throw new Error('PORT must be a positive integer');
  if (accessKeyId && secretKey) {
    return { ...common, mode: 'openapi', credential: { accessKeyId, secretKey } };
  }
  return {
    ...common,
    mode: 'cli',
    cliPath: required(env.BYTEPLUS_RTC_CLI_PATH, 'BYTEPLUS_RTC_CLI_PATH'),
    projectDir: required(env.BYTEPLUS_RTC_PROJECT_DIR, 'BYTEPLUS_RTC_PROJECT_DIR'),
  };
}

function injectEnvironmentSecrets(body, env = process.env) {
  injectSensitiveInfo(body, true);
  const asr = body?.Config?.ASRConfig;
  if (asr?.Provider === 'BytePlus') {
    asr.ProviderParams = {
      ...asr.ProviderParams,
      AppId: required(env.BYTEPLUS_SEED_SPEECH_APP_ID, 'BYTEPLUS_SEED_SPEECH_APP_ID'),
      AccessToken: required(env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN, 'BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN'),
    };
  }
  const llm = body?.Config?.LLMConfig;
  if (llm?.Mode === 'BytePlusArk') {
    llm.EndPointId = required(env.BYTEPLUS_MODEL_ENDPOINT_ID, 'BYTEPLUS_MODEL_ENDPOINT_ID');
    llm.APIKey = required(env.BYTEPLUS_MODEL_API_KEY, 'BYTEPLUS_MODEL_API_KEY');
  }
  const tts = body?.Config?.TTSConfig;
  if (tts?.Provider === 'byteplus_Bidirectional_streaming') {
    tts.ProviderParams = tts.ProviderParams || {};
    tts.ProviderParams.app = {
      ...(tts.ProviderParams.app || {}),
      appid: required(env.BYTEPLUS_SEED_SPEECH_APP_ID, 'BYTEPLUS_SEED_SPEECH_APP_ID'),
      token: required(env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN, 'BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN'),
    };
  }
  return body;
}

function invokeOpenAPI(config, action, version, body, fetchImpl = fetch) {
  const endpoint = new URL(config.endpoint);
  const requestData = {
    region: config.region,
    method: 'POST',
    params: { Action: action, Version: version },
    headers: { Host: endpoint.host, 'Content-Type': 'application/json' },
    body,
  };
  if (config.userAgent) requestData.headers['User-Agent'] = config.userAgent;
  const signer = new Signer(requestData, config.service);
  const url = `${config.endpoint}?${signer.getSignUrl(config.credential)}`;
  return fetchImpl(url, {
    method: 'POST',
    headers: requestData.headers,
    body: JSON.stringify(body),
  }).then((response) => response.json());
}

function runCLI(config, args, input, spawnImpl = spawn) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(config.cliPath, ['--format=json', ...args], {
      cwd: config.projectDir,
      env: config.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      if (stdout.length < 1024 * 1024) stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 1024 * 1024) stderr += chunk.toString();
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const envelope = parseCLIError(stdout) || parseCLIError(stderr);
        const typed = envelope?.error;
        const detail = typed?.message
          ? `${typed.code ? `${typed.code}: ` : ''}${typed.message}`
          : `byteplus-rtc ${args.slice(0, 2).join(' ')} failed`;
        reject(new Error(detail));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (!result?.ok) throw new Error('CLI returned an unsuccessful result');
        resolve(result.data);
      } catch (error) {
        reject(new Error(`invalid byteplus-rtc JSON output: ${error.message}`));
      }
    });
    child.stdin.on('error', () => undefined);
    child.stdin.end(input === undefined ? undefined : JSON.stringify(input));
  });
}

function parseCLIError(text) {
  for (let index = text.lastIndexOf('{'); index >= 0; index = text.lastIndexOf('{', index - 1)) {
    try {
      const value = JSON.parse(text.slice(index).trim());
      if (value && value.ok === false && value.error && typeof value.error === 'object') return value;
    } catch (_) {
      // Progress belongs on stderr and may precede the final JSON envelope.
    }
  }
  return undefined;
}

async function invokeAgent(config, action, body, options = {}) {
  if (!AGENT_ACTIONS.has(action)) throw new Error(`unsupported agent action ${action}`);
  if (config.mode === 'openapi') {
    return invokeOpenAPI(config, action, '2025-05-01', body, options.fetchImpl);
  }
  const command = action === START_ACTION ? 'start' : 'stop';
  const data = await runCLI(config, ['agent', command, '--runtime-request-stdin'], body, options.spawnImpl);
  return {
    ResponseMetadata: { Action: action, RequestId: `byteplus-rtc-cli-${Date.now()}` },
    Result: data?.status === 'running' || data?.status === 'stopped' ? 'ok' : data,
  };
}

async function issueToken(config, { appID, roomID, userID }, options = {}) {
  if (!appID || !roomID || !userID) throw new Error('appID, roomID and userID are required');
  if (appID !== config.appId) throw new Error('appID does not match RTC_APP_ID');
  if (config.mode === 'openapi') {
    const response = await invokeOpenAPI(
      config,
      'GetToken',
      '2025-06-01',
      { AppId: appID, RoomId: roomID, UserId: userID },
      options.fetchImpl
    );
    return response?.Result?.Token;
  }
  const data = await runCLI(
    config,
    ['token', 'issue', '--room-id', roomID, '--user-id', userID],
    undefined,
    options.spawnImpl
  );
  return data?.token;
}

function errorResponse(action, error) {
  return {
    ResponseMetadata: { Action: action, Error: { Code: 'LocalProxyError', Message: error.message } },
    Result: error.message,
  };
}

function prepareAgentBody(config, action, body) {
  // In CLI mode, raw provider credentials are fetched and injected only
  // inside the short-lived byteplus-rtc process. The Node server receives
  // selectors but never receives the exchanged secrets.
  if (config.mode === 'openapi' && isVoiceChatMode(action)) {
    injectEnvironmentSecrets(body, config.env);
  }
  return body;
}

function createApp(options = {}) {
  const config = options.config || loadRuntimeConfig(options.env);
  const activeTasks = new Map();
  const app = new Koa();
  app.use(cors({ origin: '*' }));
  app.use(bodyParser());
  app.use(async (ctx) => {
    const action = ctx.request.query?.action;
    try {
      if (ctx.method === 'GET' && ctx.path === '/health') {
        ctx.body = { ok: true, agentMode: config.mode };
        return;
      }
      if (ctx.method === 'GET' && ctx.path === '/runtimeConfig') {
        ctx.body = { Result: { appId: config.appId } };
        return;
      }
      if (ctx.method === 'POST' && ctx.path === '/proxyAIGCFetch') {
        if (!AGENT_ACTIONS.has(action)) throw new Error(`unsupported action ${action}`);
        const body = ctx.request.body;
        prepareAgentBody(config, action, body);
        const response = await invokeAgent(config, action, body, options);
        const taskId = body?.TaskId;
        if (action === START_ACTION && taskId && !response?.ResponseMetadata?.Error) {
          activeTasks.set(taskId, { AppId: body.AppId, RoomId: body.RoomId, TaskId: taskId });
        }
        if (action === STOP_ACTION && taskId && !response?.ResponseMetadata?.Error) activeTasks.delete(taskId);
        ctx.body = response;
        return;
      }
      if (ctx.method === 'POST' && ctx.path === '/generateRtcAccessToken') {
        const token = await issueToken(config, ctx.request.body || {}, options);
        if (!token) throw new Error('GetToken returned no token');
        ctx.body = { ResponseMetadata: { Action: action }, Result: { token } };
        return;
      }
      ctx.status = 404;
      ctx.body = { Result: 'Not Found' };
    } catch (error) {
      ctx.status = 400;
      ctx.body = errorResponse(action, error);
    }
  });
  app.stopActiveAgents = async () => {
    await Promise.allSettled(
      [...activeTasks.values()].map((body) => invokeAgent(config, STOP_ACTION, body, options))
    );
    activeTasks.clear();
  };
  return app;
}

function startServer(options = {}) {
  const config = options.config || loadRuntimeConfig(options.env);
  const app = createApp({ ...options, config });
  const server = app.listen(config.port, config.host, () => {
    console.log(`AIGC Server is running at http://${config.host}:${config.port}`);
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await app.stopActiveAgents();
    await new Promise((resolve) => server.close(resolve));
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => void stop().then(() => process.exit(0)));
  }
  return { app, server, stop };
}

if (require.main === module) {
  dotenv.config({ path: process.env.BYTEPLUS_RTC_ENV_FILE || path.resolve(__dirname, '../.env.local') });
  startServer();
}

module.exports = {
  START_ACTION,
  STOP_ACTION,
  createApp,
  injectEnvironmentSecrets,
  invokeAgent,
  invokeOpenAPI,
  issueToken,
  loadRuntimeConfig,
  prepareAgentBody,
  runCLI,
  startServer,
};
