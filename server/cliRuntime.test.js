const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const test = require('node:test');
const { loadConfig } = require('./config');
const { createCliRuntime } = require('./cliRuntime');

const env = { RTC_APP_ID: 'example', BYTEPLUS_RTC_CLI_PATH: '/cli', BYTEPLUS_RTC_PROJECT_DIR: '/project' };

test('CLI sessions use the selected project, CLI and stdin contract', async () => {
  const calls = [];
  const replies = [{ ready: true, issues: [] }, { token: 'fixture' }, { status: 'running' }, { status: 'stopped' }];
  function execFileImpl(file, args, options, callback) {
    assert.equal(file, env.BYTEPLUS_RTC_CLI_PATH);
    assert.equal(options.cwd, env.BYTEPLUS_RTC_PROJECT_DIR);
    let input = '';
    return { stdin: new Writable({
      write(chunk, _, next) { input += chunk; next(); },
      final(next) {
        calls.push({ args, body: input && JSON.parse(input) });
        callback(null, JSON.stringify({ ok: true, data: replies.shift() }));
        next();
      },
    }) };
  }
  const runtime = createCliRuntime(loadConfig(env), { env, execFileImpl });
  const start = { AppId: 'example', RoomId: 'room', TaskId: 'task', Config: {} };
  const stop = { AppId: 'example', RoomId: 'room', TaskId: 'task' };
  assert.deepEqual(await runtime.check('StartVoiceChat', start), { ready: true, issues: [] });
  assert.equal(await runtime.issueToken({ roomID: 'room', userID: 'user' }), 'fixture');
  assert.equal((await runtime.invoke('StartVoiceChat', start)).Result, 'ok');
  assert.equal((await runtime.invoke('StopVoiceChat', stop)).Result, 'ok');
  const command = (args, body) => ({ args: ['--format=json', ...args], body });
  assert.deepEqual(calls, [
    command(['agent', 'check', '--runtime-request-stdin'], start),
    command(['token', 'issue', '--room-id', 'room', '--user-id', 'user'], ''),
    command(['agent', 'start', '--runtime-request-stdin'], start),
    command(['agent', 'stop', '--runtime-request-stdin'], stop),
  ]);
});

test('CLI startup and Realtime preflight report missing settings', async () => {
  assert.throws(() => loadConfig({ ...env, BYTEPLUS_RTC_PROJECT_DIR: '' }), /BYTEPLUS_RTC_PROJECT_DIR/);
  const runtime = createCliRuntime(loadConfig(env), { env });
  assert.equal((await runtime.check('StartVoiceChatWithRealtimeAPI', {})).ready, false);
  assert.throws(() => runtime.prepare('StartVoiceChatWithRealtimeAPI', {}), /OPENAI_API_KEY/);
});

test('Realtime uses the selected CLI and sends server credentials through stdin', async () => {
  const actions = ['StartVoiceChatWithRealtimeAPI', 'StopVoiceChatWithRealtimeAPI'];
  const runtimeEnv = { ...env, OPENAI_API_KEY: 'fixture' };
  for (const action of actions) {
    const start = action === actions[0];
    const body = { AppId: 'example', RoomId: 'room', TaskId: 'task', ...(start && { LLMConfig: {} }) };
    const runtime = createCliRuntime(loadConfig(runtimeEnv), {
      env: runtimeEnv,
      execFileImpl(file, args, options, callback) {
        assert.equal(file, env.BYTEPLUS_RTC_CLI_PATH);
        assert.deepEqual(args, ['--format=json', 'openapi', 'invoke', '--action', action, '--version', '2025-05-01', '--body', '@-']);
        let input = '';
        return { stdin: new Writable({
          write(chunk, _, next) { input += chunk; next(); },
          final(next) {
            assert.deepEqual(JSON.parse(input), body);
            callback(null, JSON.stringify({ ok: true, data: { body: { Result: 'ok' } } }));
            next();
          },
        }) };
      },
    });
    if (start) assert.deepEqual(await runtime.check(action, body), { ready: true, issues: [] });
    runtime.prepare(action, body);
    assert.equal(body.LLMConfig?.Token, start ? 'fixture' : undefined);
    assert.equal((await runtime.invoke(action, body)).Result, 'ok');
  }
});
