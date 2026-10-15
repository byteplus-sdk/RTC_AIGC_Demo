const assert = require('node:assert/strict');
const test = require('node:test');
const fetch = require('node-fetch');
const { createApp } = require('./app');
const { VOICE_CHAT_MODE, REALTIME_API_MODE } = require('./sensitive');

async function serve(t, options) {
  const server = createApp(options).listen(0, '127.0.0.1');
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
  assert.equal(body.Result, 'GenerateRtcAccessToken failed');
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
