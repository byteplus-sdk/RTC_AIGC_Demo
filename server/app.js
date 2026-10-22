/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const path = require('path');
const { spawn } = require('child_process');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('koa2-cors');
const { Signer } = require('@byteplus/vcloud-sdk-nodejs');
const fetch = require('node-fetch');
const { getLlmCredentialField, getLlmApiKey } = require('./providerConfig');
const { createAgentLifecycle } = require('./agentLifecycle');
const { preflight } = require('./preflight');
if (require.main === module) {
  require('dotenv').config({ path: process.env.BYTEPLUS_RTC_ENV_FILE || path.resolve(__dirname, '../.env.local') });
}
const { injectSensitiveInfo } = require('./sensitive');
const { isVoiceChatMode } = require('./util');

const START_ACTION = 'StartVoiceChat';
const RTC_ENDPOINT = 'https://rtc.ap-southeast-1.byteplusapi.com';

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
  const common = {
    appId: required(env.RTC_APP_ID, 'RTC_APP_ID'),
    host: env.HOST?.trim() || '127.0.0.1',
    endpoint: env.BYTEPLUS_RTC_ENDPOINT?.trim() || RTC_ENDPOINT,
    region: env.BYTEPLUS_RTC_REGION?.trim() || 'ap-southeast-1',
    service: env.BYTEPLUS_RTC_SERVICE?.trim() || 'rtc',
    userAgent: env.BYTEPLUS_RTC_OPENAPI_USER_AGENT?.trim() || undefined,
    port,
    env,
  };
  if (env.BYTEPLUS_ACCESS_KEY_ID?.trim() && env.BYTEPLUS_SECRET_ACCESS_KEY?.trim()) {
    return {
      ...common, mode: 'openapi',
      credential: {
        accessKeyId: required(env.BYTEPLUS_ACCESS_KEY_ID, 'BYTEPLUS_ACCESS_KEY_ID'),
        secretKey: required(env.BYTEPLUS_SECRET_ACCESS_KEY, 'BYTEPLUS_SECRET_ACCESS_KEY'),
      },
    };
  }
  return {
    ...common, mode: 'cli',
    cliPath: required(env.BYTEPLUS_RTC_CLI_PATH, 'BYTEPLUS_RTC_CLI_PATH'),
    projectDir: required(env.BYTEPLUS_RTC_PROJECT_DIR, 'BYTEPLUS_RTC_PROJECT_DIR'),
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
      BytePlus: speech, Amazon: amazon, amazon, google, Google: google,
      GoogleV2: [...google, 'GOOGLE_RECOGNIZER_PATH'],
    }[config?.ASRConfig?.Provider] || []));
    fields.push(...({
      BytePlus: speech, byteplus_Bidirectional_streaming: speech, Amazon: amazon, amazon, Google: google,
      OpenAI: ['OPENAI_API_KEY'], openai: ['OPENAI_API_KEY'],
    }[config?.TTSConfig?.Provider] || []));
    if (config?.LLMConfig) {
      const field = getLlmCredentialField(config.LLMConfig);
      required(getLlmApiKey(config.LLMConfig, env), field === 'CUSTOM_LLM_API_KEY' ? 'CUSTOM_LLM_API_KEY or OPENAI_API_KEY' : field);
    }
    if (config?.WebSearchAgentConfig?.Enable === true) {
      fields.push('ASKECHO_API_KEY');
      required(env.ASKECHO_API_KEY, 'ASKECHO_API_KEY');
      const params = JSON.parse(config.WebSearchAgentConfig.ParamsString || '{}');
      required(env.ASKECHO_BOT_ID || params.bot_id, 'ASKECHO_BOT_ID');
      const name = config.WebSearchAgentConfig.FunctionName || 'WebSearch';
      if (config.LLMConfig?.MCP?.some((item) => item.Name === name)) {
        throw new Error(`MCP name conflicts with web search: ${name}`);
      }
    }
  } else {
    fields.push('OPENAI_API_KEY');
  }
  const avatar = isVoiceChatMode(action) ? body?.Config?.AvatarConfig : body?.AvatarConfig;
  if (avatar?.Enabled) {
    fields.push(...(avatar.Provider === 'Akool' ? ['AKOOL_API_KEY'] : ['AVATAR_APP_ID', 'AVATAR_TOKEN']));
  }
  for (const field of new Set(fields)) required(env[field], field);
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

function invokeOpenAPI(config, action, version, body, fetchImpl = fetch, signal) {
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
    timeout: 5000,
    signal,
  }).then((response) => {
    if (response.ok === false) throw new Error(`RTC OpenAPI returned HTTP ${response.status}`);
    return response.json();
  });
}

function runCLI(config, args, input, spawnImpl = spawn, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Agent request aborted'));
    const child = spawnImpl(config.cliPath, ['--format=json', ...args], {
      cwd: config.projectDir,
      env: config.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const abort = () => child.kill('SIGKILL');
    signal?.addEventListener('abort', abort, { once: true });
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
      signal?.removeEventListener('abort', abort);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
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
    return invokeOpenAPI(config, action, '2025-05-01', body, options.fetchImpl, options.signal);
  }
  if (!isVoiceChatMode(action)) {
    throw Object.assign(new Error(`unsupported CLI action ${action}`), { status: 400 });
  }
  const command = action === START_ACTION ? 'start' : 'stop';
  const data = await runCLI(config, ['agent', command, '--runtime-request-stdin'], body, options.spawnImpl, options.signal);
  return {
    ResponseMetadata: { Action: action, RequestId: `byteplus-rtc-cli-${Date.now()}` },
    Result: data?.status === 'running' || data?.status === 'stopped' ? 'ok' : data,
  };
}

async function issueToken(config, { appID, roomID, userID }, options = {}) {
  if (![appID, roomID, userID].every((value) => typeof value === 'string' && value.trim())) throw Object.assign(new Error('appID, roomID and userID are required'), { status: 400 });
  if (appID !== config.appId) throw Object.assign(new Error('appID does not match RTC_APP_ID'), { status: 400 });
  if (config.mode === 'openapi') {
    const response = await invokeOpenAPI(
      config,
      'GetToken',
      '2025-06-01',
      { AppId: appID, RoomId: roomID, UserId: userID },
      options.fetchImpl,
      options.signal
    );
    return response?.Result?.Token;
  }
  const data = await runCLI(
    config,
    ['token', 'issue', '--room-id', roomID, '--user-id', userID],
    undefined,
    options.spawnImpl,
    options.signal
  );
  return data?.token;
}

function prepareAgentBody(config, action, body) {
  // In CLI mode, raw provider credentials are fetched and injected only
  // inside the short-lived byteplus-rtc process. The Node server receives
  // selectors but never receives the exchanged secrets.
  if (config.mode === 'openapi') {
    if (isVoiceChatMode(action)) {
      injectEnvironmentSecrets(body, config.env);
    } else {
      injectSensitiveInfo(body, false);
    }
  }
  return body;
}

function createApp(options = {}) {
  const { fetchImpl = fetch, env = process.env, probeSpeech } = options;
  const config = options.config || loadConfig(env);
  const app = new Koa();
  const controller = new AbortController();
  const lifecycle = createAgentLifecycle((action, body) =>
    invokeAgent(config, action, body, { ...options, fetchImpl, signal: controller.signal })
  );
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
      ctx.body = { ok: true, agentMode: config.mode };
      return;
    }
    if (ctx.method === 'POST' && ctx.path === '/preflight') {
      const action = ctx.request.query.action;
      if (!AGENT_ACTIONS.has(action) || !action.startsWith('Start')) ctx.throw(400, 'unsupported preflight action');
      ctx.body = await preflight(action, ctx.request.body, env, { validate: validateProviderConfig, probe: probeSpeech });
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
      if (config.mode === 'openapi') validateProviderConfig(action, body, config.env);

      /**
       * @brief If OpenAPI invoked in the client like website, advised to generate session token for security.
       *        OpenAPI invoked in server side in this example, not necessary to generate session token.
       */
      // await getSessionToken();

      /** Injecting the sensitive info to request body */
      prepareAgentBody(config, action, body);

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
      const accessToken = await issueToken(config, { appID, roomID, userID }, { ...options, fetchImpl, signal: controller.signal });
      if (!accessToken) throw new Error('GetToken returned no token');
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
  const config = options.config || loadConfig(options.env);
  const { port, host } = config;
  const app = createApp(options);
  const server = app.listen(port, host, () => {
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

module.exports = {
  createApp, loadConfig, loadRuntimeConfig: loadConfig, startServer, validateProviderConfig,
  injectEnvironmentSecrets, invokeAgent, invokeOpenAPI, issueToken, prepareAgentBody, runCLI,
};
