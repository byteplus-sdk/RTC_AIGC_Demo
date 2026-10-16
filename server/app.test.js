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
