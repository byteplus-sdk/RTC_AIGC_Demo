const assert = require('node:assert/strict');
const test = require('node:test');
const { createAgentLifecycle } = require('./agentLifecycle');

const task = { AppId: 'app', RoomId: 'room', TaskId: 'user' };
const ok = { Result: 'ok' };
const failed = { ResponseMetadata: { Error: { Code: 'Rejected' } } };

for (const suffix of ['', 'WithRealtimeAPI']) {
  test(`shutdown stops active ${suffix || 'Flexible'} tasks in each room`, async () => {
    const calls = [];
    const lifecycle = createAgentLifecycle(async (action, body) => {
      calls.push({ action, body });
      return ok;
    });
    await lifecycle.request(`StartVoiceChat${suffix}`, task);
    await lifecycle.request(`StartVoiceChat${suffix}`, { ...task, RoomId: 'other-room' });
    await lifecycle.stop();
    assert.deepEqual(calls.slice(2), [
      { action: `StopVoiceChat${suffix}`, body: task },
      { action: `StopVoiceChat${suffix}`, body: { ...task, RoomId: 'other-room' } },
    ]);
  });
}

test('shutdown waits for pending starts, rejects new requests and coalesces repeated stops', async () => {
  let finishStart;
  const calls = [];
  const lifecycle = createAgentLifecycle(async (action) => {
    calls.push(action);
    if (action === 'StartVoiceChat') await new Promise((resolve) => { finishStart = resolve; });
    return ok;
  });
  const start = lifecycle.request('StartVoiceChat', task);
  const stop = lifecycle.stop();
  assert.equal(lifecycle.stop(), stop);
  await assert.rejects(lifecycle.request('StartVoiceChat', { ...task, RoomId: 'new' }), { status: 503 });
  assert.deepEqual(calls, ['StartVoiceChat']);
  finishStart();
  await start;
  await stop;
  assert.deepEqual(calls, ['StartVoiceChat', 'StopVoiceChat']);
});

test('concurrent start and stop requests for a task preserve order', async () => {
  let finishStart;
  const calls = [];
  const lifecycle = createAgentLifecycle(async (action) => {
    calls.push(action);
    if (action === 'StartVoiceChat') await new Promise((resolve) => { finishStart = resolve; });
    return ok;
  });
  const start = lifecycle.request('StartVoiceChat', task);
  const stop = lifecycle.request('StopVoiceChat', task);
  assert.deepEqual(calls, ['StartVoiceChat']);
  finishStart();
  await Promise.all([start, stop]);
  await lifecycle.stop();
  assert.deepEqual(calls, ['StartVoiceChat', 'StopVoiceChat']);
});

test('failed starts are excluded and failed stops remain tracked for shutdown', async () => {
  const calls = [];
  const lifecycle = createAgentLifecycle(async (action, body) => {
    calls.push({ action, body });
    if (body.RoomId === 'failed-start' || calls.length === 3) return failed;
    return ok;
  });
  await lifecycle.request('StartVoiceChat', { ...task, RoomId: 'failed-start' });
  await lifecycle.request('StartVoiceChat', task);
  await lifecycle.request('StopVoiceChat', task);
  await lifecycle.stop();
  assert.deepEqual(calls[3], { action: 'StopVoiceChat', body: task });
  assert.equal(calls.length, 4);
});

test('shutdown reports both rejected responses and transport failures', async () => {
  for (const failure of [async () => failed, async () => { throw new Error('unavailable'); }]) {
    const lifecycle = createAgentLifecycle(async (action) => action.startsWith('Start') ? ok : failure());
    await lifecycle.request('StartVoiceChat', task);
    await assert.rejects(lifecycle.stop(), /Failed to stop 1 active agent/);
  }
});

for (const suffix of ['', 'WithRealtimeAPI']) {
  test(`uncertain ${suffix || 'Flexible'} starts are stopped before reporting failure`, async () => {
    const calls = [];
    let cloudActive = false;
    const timeout = new Error('request timed out');
    const lifecycle = createAgentLifecycle(async (action, body) => {
      calls.push({ action, body });
      if (action.startsWith('Start')) {
        cloudActive = true;
        throw timeout;
      }
      cloudActive = false;
      return ok;
    });
    await assert.rejects(lifecycle.request(`StartVoiceChat${suffix}`, task), (error) => error === timeout);
    assert.equal(cloudActive, false);
    await lifecycle.stop();
    assert.deepEqual(calls, [
      { action: `StartVoiceChat${suffix}`, body: task },
      { action: `StopVoiceChat${suffix}`, body: task },
    ]);
  });
}

test('failed compensation remains tracked for shutdown', async () => {
  for (const failure of [async () => failed, async () => { throw new Error('stop unavailable'); }]) {
    const calls = [];
    const lifecycle = createAgentLifecycle(async (action, body) => {
      calls.push({ action, body });
      if (action.startsWith('Start')) throw new Error('request timed out');
      return calls.length === 2 ? failure() : ok;
    });
    await assert.rejects(lifecycle.request('StartVoiceChat', task), /request timed out/);
    await lifecycle.stop();
    assert.deepEqual(calls.map((call) => call.action), ['StartVoiceChat', 'StopVoiceChat', 'StopVoiceChat']);
  }
});
