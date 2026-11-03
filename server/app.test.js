const assert = require('node:assert/strict');
const test = require('node:test');
const fetch = require('node-fetch');
const { createApp, loadConfig, validateProviderConfig } = require('./app');
const { VOICE_CHAT_MODE, REALTIME_API_MODE } = require('./sensitive');

const env = {
  RTC_APP_ID: 'test-app', RTC_APP_KEY: 'test-app-key',
  BYTEPLUS_ACCESS_KEY_ID: 'test-ak', BYTEPLUS_SECRET_ACCESS_KEY: 'test-sk',
  OPENAI_API_KEY: 'test-openai-key',
};

async function serve(t, options) {
  const server = createApp({ env, ...options }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function post(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('health reports availability without contacting upstream services', async (t) => {
  const base = await serve(t, { fetchImpl: () => assert.fail('unexpected upstream call') });
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

for (const action of [
  'StartVoiceChat',
  'StopVoiceChat',
  'StartVoiceChatWithRealtimeAPI',
  'StopVoiceChatWithRealtimeAPI',
]) {
  test(`${action} forwards the request and OpenAPI response`, async (t) => {
    const response = { ResponseMetadata: { Action: action }, Result: 'ok' };
    let forwarded;
    const base = await serve(t, {
      fetchImpl: async (url, options) => {
        assert.equal(new URL(url).searchParams.get('Action'), action);
        forwarded = JSON.parse(options.body);
        return { json: async () => response };
      },
    });
    const flexible = action === 'StartVoiceChat' || action === 'StopVoiceChat';
    const body = flexible
      ? { Config: { LLMConfig: { Mode: 'CustomLLM' } } }
      : { LLMConfig: { Token: 'client-token' } };
    const res = await post(`${base}/proxyAIGCFetch?action=${action}`, body);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), response);
    if (flexible) {
      assert.equal(forwarded.Config.LLMConfig.APIKey, VOICE_CHAT_MODE.LLMConfig.CustomLLM.APIKey);
    } else {
      assert.equal(forwarded.LLMConfig.Token, REALTIME_API_MODE.LLMConfig.Token);
    }
  });
}

const gatewayEnv = {
  ...env,
  ASR_GATEWAY_API_URL: 'wss://asr.example/ws', ASR_GATEWAY_API_KEY: 'asr-key',
  TTS_GATEWAY_API_URL: 'wss://tts.example/ws', TTS_GATEWAY_API_KEY: 'tts-key',
};

const gateway = (ProviderParams) => ({ Provider: 'ai_gateway', ProviderParams });

async function assertGatewayRejected(base, body, message) {
  const check = await post(`${base}/preflight?action=StartVoiceChat`, body);
  const result = await check.json();
  assert.equal(result.ready, false);
  assert.match(result.issues[0].message, message);
  const start = await post(`${base}/proxyAIGCFetch?action=StartVoiceChat`, body);
  assert.equal(start.status, 400);
  assert.equal((await start.json()).Result, result.issues[0].message);
}

test('provider validation succeeds without returning credentials or changing the request', () => {
  const body = { Config: { ASRConfig: gateway({}), TTSConfig: gateway({ Voice: 'test-voice' }) } };
  const original = structuredClone(body);
  assert.equal(validateProviderConfig('StartVoiceChat', body, gatewayEnv), undefined);
  assert.deepEqual(body, original);
});

test('only StartVoiceChat binds each selected gateway to its deployed URL and key', async (t) => {
  const ASRConfig = gateway({ ExtraHeader: { Authorization: 'session-value', 'x-model': 'asr' } });
  const TTSConfig = gateway({ Voice: 'test-voice', OutputAudioVolume: 0, ExtraData: { models: ['model', 2] } });
  const body = { Config: { LLMConfig: { Provider: 'OpenAI' }, ASRConfig, TTSConfig } };
  let forwarded;
  const base = await serve(t, {
    env: gatewayEnv,
    probeSpeech: () => assert.fail('unexpected speech probe'),
    fetchImpl: async (url, options) => {
      forwarded = JSON.parse(options.body);
      return { json: async () => ({ Result: 'ok' }) };
    },
  });
  const preflight = await post(`${base}/preflight?action=StartVoiceChat`, body);
  assert.deepEqual(await preflight.json(), { ready: true, issues: [] });
  assert.equal(forwarded, undefined);
  const started = await post(`${base}/proxyAIGCFetch?action=StartVoiceChat`, body);
  assert.equal(started.status, 200);
  for (const kind of ['ASR', 'TTS']) {
    const field = `${kind}Config`;
    assert.deepEqual(forwarded.Config[field], gateway({
      ...body.Config[field].ProviderParams,
      URL: gatewayEnv[`${kind}_GATEWAY_API_URL`], APIKey: gatewayEnv[`${kind}_GATEWAY_API_KEY`],
    }));
  }
  const stopped = await post(`${base}/proxyAIGCFetch?action=StopVoiceChat`, body);
  assert.equal(stopped.status, 200);
  assert.deepEqual(forwarded.Config.ASRConfig, ASRConfig);
  assert.deepEqual(forwarded.Config.TTSConfig, TTSConfig);
});

for (const kind of ['ASR', 'TTS']) {
  test(`${kind} requires only its own gateway pair and rejects partial configuration before forwarding`, async (t) => {
    const config = {
      LLMConfig: { Provider: 'OpenAI' },
      ASRConfig: { Provider: 'Google' }, TTSConfig: { Provider: 'OpenAI' },
      [`${kind}Config`]: gateway(kind === 'TTS' ? { Voice: 'test-voice' } : undefined),
    };
    const urlField = `${kind}_GATEWAY_API_URL`;
    const keyField = `${kind}_GATEWAY_API_KEY`;
    const selected = { ...env, GOOGLE_CREDENTIALS_JSON: '{}', [urlField]: gatewayEnv[urlField], [keyField]: gatewayEnv[keyField] };
    const base = await serve(t, { env: selected, fetchImpl: () => assert.fail('unexpected upstream call') });
    const body = { Config: config };
    const ready = () => post(`${base}/preflight?action=StartVoiceChat`, body).then((res) => res.json());
    assert.deepEqual(await ready(), { ready: true, issues: [] });
    for (const [field, value] of [[keyField, ' '], [urlField, ''], [urlField, 'https://invalid.example'],
      [urlField, 'wss:not-an-endpoint'], [urlField, 'wss://user:pass@invalid.example/ws'],
      [urlField, 'wss://invalid.example/#'], [urlField, 'ws://invalid.example/ws']]) {
      selected[field] = value;
      const result = await ready();
      assert.equal(result.ready, false);
      assert.match(result.issues[0].message, new RegExp(field));
      assert.doesNotMatch(result.issues[0].message, /invalid\.example|user:pass/);
      const start = await post(`${base}/proxyAIGCFetch?action=StartVoiceChat`, body);
      assert.equal((await start.json()).Result, result.issues[0].message);
      selected[field] = gatewayEnv[field];
    }
  });
}

test('forged gateway destinations and credentials are rejected by preflight and start', async (t) => {
  const base = await serve(t, { env: gatewayEnv, fetchImpl: () => assert.fail('unexpected upstream call') });
  const target = 'wss://untrusted.example/ws';
  for (const kind of ['ASR', 'TTS']) {
    const field = `${kind}Config`;
    const config = { ASRConfig: gateway({}), TTSConfig: gateway({ Voice: 'test-voice' }), LLMConfig: { Provider: 'OpenAI' } };
    for (const patch of [
      { ProviderParams: { URL: target } }, { ProviderParams: { url: target } }, { ProviderParams: { APIKey: 'from-client' } },
      { providerparams: { URL: target } },
    ]) {
      const body = { Config: { ...config, [field]: { ...config[field], ...patch } } };
      await assertGatewayRejected(base, body, /session parameters|exact field name/);
    }
  }
});

test('preflight and start reject aliases anywhere on the speech provider path', async (t) => {
  const upstream = t.mock.fn();
  const base = await serve(t, { env: gatewayEnv, fetchImpl: upstream });
  for (const kind of ['ASR', 'TTS']) {
    const field = `${kind}Config`;
    const params = { URL: 'wss://untrusted.example/ws', APIKey: 'client-key' };
    const config = {
      ASRConfig: gateway({}), TTSConfig: gateway({ Voice: 'voice' }), LLMConfig: { Provider: 'OpenAI' },
    };
    for (const [name, body] of [
      ['Provider', { Config: { ...config, [field]: { provider: 'ai_gateway', ProviderParams: params } } }],
      ['Provider', { Config: { ...config, [field]: { Provider: 'Google', provider: 'ai_gateway', ProviderParams: params } } }],
      ['ProviderParams', { Config: { ...config, [field]: { Provider: 'ai_gateway', providerparams: params } } }],
      [field, { Config: { ...config, [field]: undefined, [field.toLowerCase()]: gateway(params) } }],
      ['Config', { config: { ...config, [field]: gateway(params) } }],
    ]) {
      await assertGatewayRejected(base, body, new RegExp(`exact field name ${name}$`));
    }
  }
  assert.equal(upstream.mock.callCount(), 0);
});

for (const kind of ['ASR', 'TTS']) {
  test(`${kind} gateway preflight and start require JSON objects for extra data and headers`, async (t) => {
    const upstream = t.mock.fn();
    const base = await serve(t, { env: gatewayEnv, fetchImpl: upstream });
    for (const field of ['ExtraData', 'ExtraHeader']) {
      for (const value of [null, [], 'text', 1, false]) {
        const config = { ASRConfig: gateway({}), TTSConfig: gateway({ Voice: 'voice' }), LLMConfig: { Provider: 'OpenAI' } };
        config[`${kind}Config`].ProviderParams[field] = value;
        await assertGatewayRejected(base, { Config: config }, new RegExp(`${field} must be a JSON object`));
      }
    }
    assert.equal(upstream.mock.callCount(), 0);
  });
}

test('invalid AI Gateway session parameters fail the provider check', () => {
  for (const [overrides, message] of [
    [{ Voice: '' }, /voice/],
    [{ OutputAudioSpeedRate: 'fast' }, /finite number/],
  ]) {
    const body = { Config: { TTSConfig: gateway({ Voice: 'test-voice', ...overrides }) } };
    assert.throws(() => validateProviderConfig('StartVoiceChat', body, gatewayEnv), message);
  }
});

test('token generation returns a locally signed token', async (t) => {
  const base = await serve(t);
  const res = await post(`${base}/generateRtcAccessToken?action=GenerateRtcAccessToken`, {
    appID: 'test-app', roomID: 'test-room', userID: 'test-user',
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ResponseMetadata.Action, 'GenerateRtcAccessToken');
  assert.equal(typeof body.Result.token, 'string');
  assert.ok(body.Result.token.length > 0);
});

test('missing token input returns an actionable error', async (t) => {
  const base = await serve(t);
  const res = await post(`${base}/generateRtcAccessToken?action=GenerateRtcAccessToken`, {});
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ResponseMetadata.Action, 'GenerateRtcAccessToken');
  assert.equal(body.ResponseMetadata.Error.Code, 'LocalProxyError');
  assert.equal(body.Result, 'appID, roomID and userID are required');
});

test('upstream failures return a structured error', async (t) => {
  const base = await serve(t, {
    fetchImpl: async () => { throw new Error('upstream unavailable'); },
  });
  const res = await post(`${base}/proxyAIGCFetch?action=StopVoiceChat`, {});
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.ResponseMetadata.Action, 'StopVoiceChat');
  assert.equal(body.ResponseMetadata.Error.Message, 'upstream unavailable');
  assert.equal(body.Result, 'upstream unavailable');
});

test('malformed JSON returns a structured client error', async (t) => {
  const base = await serve(t);
  const res = await fetch(`${base}/proxyAIGCFetch?action=StartVoiceChat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ResponseMetadata.Error.Code, 'LocalProxyError');
  assert.equal(typeof body.Result, 'string');
});

test('unknown routes and route suffixes return 404', async (t) => {
  const base = await serve(t);
  for (const path of ['/missing', '/proxyAIGCFetch/extra', '/generateRtcAccessToken/extra']) {
    const res = await post(`${base}${path}`, {});
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { Result: 'Not Found' });
  }
});

test('startup validates common credentials and port', () => {
  for (const field of ['RTC_APP_ID', 'RTC_APP_KEY', 'BYTEPLUS_ACCESS_KEY_ID', 'BYTEPLUS_SECRET_ACCESS_KEY']) {
    assert.throws(() => loadConfig({ ...env, [field]: '' }), new RegExp(field));
  }
  for (const port of ['0', '-1', '1.5', '65536', 'invalid']) {
    assert.throws(() => loadConfig({ ...env, SERVER_PORT: port }), /SERVER_PORT/);
  }
  assert.equal(loadConfig(env).port, 3001);
  assert.equal(loadConfig({ ...env, SERVER_PORT: '3101' }).port, 3101);
});

test('unsupported actions are rejected before forwarding', async (t) => {
  const base = await serve(t, { fetchImpl: () => assert.fail('unexpected upstream call') });
  for (const action of ['', 'DeleteRoom', 'StartVoiceChatExtra']) {
    const res = await post(`${base}/proxyAIGCFetch?action=${action}`, {});
    assert.equal(res.status, 400);
    assert.match((await res.json()).Result, /unsupported action/);
  }
});

test('token requests must use the configured application and nonempty identifiers', async (t) => {
  const base = await serve(t);
  for (const body of [
    { appID: 'other-app', roomID: 'room', userID: 'user' },
    { appID: 'test-app', roomID: ' ', userID: 'user' },
    { appID: 'test-app', roomID: 'room', userID: 123 },
  ]) {
    const res = await post(`${base}/generateRtcAccessToken`, body);
    assert.equal(res.status, 400);
  }
});

test('provider credentials are checked on start and stop remains available', () => {
  const body = { Config: { ASRConfig: { Provider: 'BytePlus' } } };
  assert.throws(() => validateProviderConfig('StartVoiceChat', body, env), /BYTEPLUS_SEED_SPEECH_APP_ID/);
  assert.doesNotThrow(() => validateProviderConfig('StopVoiceChat', body, {}));
  assert.doesNotThrow(() => validateProviderConfig('StopVoiceChatWithRealtimeAPI', {}, {}));
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', body, {
    ...env, BYTEPLUS_SEED_SPEECH_APP_ID: 'speech', BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN: 'token',
  }));
});

test('missing provider credentials return a named configuration error before forwarding', async (t) => {
  const base = await serve(t, {
    env: { ...env, OPENAI_API_KEY: '' },
    fetchImpl: () => assert.fail('unexpected upstream call'),
  });
  const res = await post(`${base}/proxyAIGCFetch?action=StartVoiceChatWithRealtimeAPI`, {});
  assert.equal(res.status, 502);
  assert.equal((await res.json()).Result, 'OPENAI_API_KEY is required');
});

test('provider selection controls credential requirements and Custom LLM fallback', () => {
  for (const [category, selection, expected] of [
    ['ASRConfig', { Provider: 'amazon' }, 'AWS_ACCESS_KEY_ID'],
    ['ASRConfig', { Provider: 'GoogleV2' }, 'GOOGLE_RECOGNIZER_PATH'],
    ['TTSConfig', { Provider: 'Google' }, 'GOOGLE_CREDENTIALS_JSON'],
    ['TTSConfig', { Provider: 'openai' }, 'OPENAI_API_KEY'],
    ['LLMConfig', { Mode: 'BytePlusArk' }, 'BYTEPLUS_MODEL_API_KEY'],
    ['WebSearchAgentConfig', { Enable: true }, 'ASKECHO_API_KEY'],
  ]) {
    assert.throws(() => validateProviderConfig('StartVoiceChat', { Config: { [category]: selection } }, {
      GOOGLE_CREDENTIALS_JSON: '{}', [expected]: '',
    }), new RegExp(expected));
  }
  const custom = { Config: { LLMConfig: { Mode: 'CustomLLM' } } };
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', custom, env));
  assert.doesNotThrow(() => validateProviderConfig('StartVoiceChat', custom, { CUSTOM_LLM_API_KEY: 'custom' }));
  assert.throws(() => validateProviderConfig('StartVoiceChat', custom, {}), /CUSTOM_LLM_API_KEY or OPENAI_API_KEY/);
});


test('runtime configuration exposes the public AppId', async (t) => {
  const base = await serve(t);
  const res = await fetch(`${base}/runtimeConfig`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { Result: { appId: 'test-app' } });
});


test('shutdown sends matching Stop requests for both modes through the proxy transport', async (t) => {
  const calls = [];
  const app = createApp({ env, fetchImpl: async (url, options) => {
    calls.push({ action: new URL(url).searchParams.get('Action'), body: JSON.parse(options.body) });
    assert.equal(options.timeout, 5000);
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ Result: 'ok' }) };
  } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const suffix of ['', 'WithRealtimeAPI']) {
    const res = await post(`${base}/proxyAIGCFetch?action=StartVoiceChat${suffix}`, {
      AppId: 'test-app', RoomId: `room${suffix}`, TaskId: 'user',
    });
    assert.equal(res.status, 200);
  }
  await app.stopActiveAgents();
  assert.deepEqual(calls.slice(2), [
    { action: 'StopVoiceChat', body: { AppId: 'test-app', RoomId: 'room', TaskId: 'user' } },
    { action: 'StopVoiceChatWithRealtimeAPI', body: { AppId: 'test-app', RoomId: 'roomWithRealtimeAPI', TaskId: 'user' } },
  ]);
  const res = await post(`${base}/proxyAIGCFetch?action=StopVoiceChat`, {});
  assert.equal(res.status, 503);
});

test('SIGTERM stops active agents and exits the server process', { timeout: 10000 }, async (t) => {
  const { spawn } = require('node:child_process');
  const child = spawn(process.execPath, ['-e', `
    const Koa = require('koa');
    const listen = Koa.prototype.listen;
    Koa.prototype.listen = function () { return listen.call(this, 0, '127.0.0.1'); };
    const { startServer } = require('./app');
    const server = startServer({
      env: ${JSON.stringify(env)},
      fetchImpl: async (url) => {
        process.send({ action: new URL(url).searchParams.get('Action') });
        return { ok: true, json: async () => ({ Result: 'ok' }) };
      },
    });
    server.once('listening', () => process.send({ port: server.address().port }));
    const stop = server.stop;
    server.stop = () => stop().finally(() => process.disconnect());
  `], { cwd: __dirname, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  const calls = [];
  let errors = '';
  child.stderr.on('data', (chunk) => { errors += chunk; });
  const exited = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  });
  const port = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', () => reject(new Error(errors || 'Server exited before listening')));
    child.on('message', (message) => {
      if (message.action) calls.push(message.action);
      if (message.port) resolve(message.port);
    });
  });
  const res = await post(`http://127.0.0.1:${port}/proxyAIGCFetch?action=StartVoiceChatWithRealtimeAPI`, {
    AppId: 'test-app', RoomId: 'room', TaskId: 'user',
  });
  assert.equal(res.status, 200);
  child.kill('SIGTERM');
  assert.equal(await exited, 0, errors);
  assert.deepEqual(calls, ['StartVoiceChatWithRealtimeAPI', 'StopVoiceChatWithRealtimeAPI']);
});

test('accepted starts with delayed responses receive compensating Stop requests', async (t) => {
  const http = require('node:http');
  const calls = [];
  let cloudActive = false;
  const upstream = http.createServer((req, res) => {
    const action = new URL(req.url, 'http://localhost').searchParams.get('Action');
    calls.push(action);
    cloudActive = action.startsWith('Start');
    req.resume();
    const respond = () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ Result: 'ok' }));
    };
    if (cloudActive) setTimeout(respond, 100);
    else respond();
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => upstream.close(resolve)));
  const app = createApp({ env, fetchImpl: (url, options) => {
    const action = new URL(url).searchParams.get('Action');
    return fetch(`http://127.0.0.1:${upstream.address().port}/?Action=${action}`, {
      ...options, timeout: action.startsWith('Start') ? 20 : 1000,
    });
  } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  for (const suffix of ['', 'WithRealtimeAPI']) {
    const res = await post(`http://127.0.0.1:${server.address().port}/proxyAIGCFetch?action=StartVoiceChat${suffix}`, {
      AppId: 'test-app', RoomId: 'room', TaskId: 'user',
    });
    assert.equal(res.status, 502);
    assert.equal(cloudActive, false);
  }
  await app.stopActiveAgents();
  assert.deepEqual(calls, [
    'StartVoiceChat', 'StopVoiceChat',
    'StartVoiceChatWithRealtimeAPI', 'StopVoiceChatWithRealtimeAPI',
  ]);
});

test('preflight reports missing avatar credentials before creating any task', async t => {
 let calls=0;
 const base=await serve(t,{fetchImpl:async()=>{calls++;throw new Error('unexpected API call');}});
 const res=await post(`${base}/preflight?action=StartVoiceChat`,{Config:{LLMConfig:{Provider:'OpenAI'},ASRConfig:{Provider:'Amazon'},TTSConfig:{Provider:'OpenAI'},AvatarConfig:{Enabled:true,Provider:'Akool',ProviderParams:{AvatarId:'avatar'}}}});
 const result=await res.json();assert.equal(res.status,200);assert.equal(result.ready,false);assert.equal(calls,0);
});
