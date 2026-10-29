const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { startupIssues, webEnvironment, portAvailable, selectWebPort, prefixOutput, startChildren } = require('./dev.cjs');

const env = {
  RTC_APP_ID: 'test-app', RTC_APP_KEY: 'test-app-key', BYTEPLUS_ACCESS_KEY_ID: 'test-ak', BYTEPLUS_SECRET_ACCESS_KEY: 'test-sk',
};

test('startup reports all missing Realtime settings without disclosing values', () => {
  const issues = startupIssues({ BYTEPLUS_ACCESS_KEY_ID: 'private-value', PORT: '-1' }, 'all', 'realtime');
  const text = issues.join('\n');
  for (const field of ['RTC_APP_ID', 'BYTEPLUS_SECRET_ACCESS_KEY', 'OPENAI_API_KEY', 'PORT']) assert.match(text, new RegExp(field));
  assert.equal(text.includes('private-value'), false);
  assert.equal(startupIssues({ ...env, OPENAI_API_KEY: 'private' }, 'all', 'realtime').length, 0);
});

test('Flexible defers selected provider credentials to the existing preflight', () => {
  assert.deepEqual(startupIssues(env, 'all', 'flexible'), []);
});

test('server-only startup checks common credentials independently of conversation mode', () => {
  assert.deepEqual(startupIssues(env, 'server', 'realtime'), []);
  assert.deepEqual(startupIssues({ ...env, RTC_APP_KEY: '' }, 'server', 'realtime'), []);
});

test('CLI startup accepts Signin configuration and validates partial access keys', () => {
  const cliEnv = {
    RTC_APP_ID: 'test-app',
    BYTEPLUS_RTC_CLI_PATH: '/tmp/byteplus-rtc',
    BYTEPLUS_RTC_PROJECT_DIR: '/tmp/project',
  };
  assert.deepEqual(startupIssues(cliEnv, 'all', 'flexible'), []);
  assert.deepEqual(startupIssues(cliEnv, 'server', 'realtime'), []);
  assert.match(startupIssues({ ...cliEnv, BYTEPLUS_ACCESS_KEY_ID: 'test-ak' }, 'all', 'flexible').join('\n'), /must be set together/);
  for (const key of ['BYTEPLUS_RTC_CLI_PATH', 'BYTEPLUS_RTC_PROJECT_DIR']) {
    assert.match(startupIssues({ ...cliEnv, [key]: '' }, 'all', 'flexible').join('\n'), new RegExp(key));
  }
});

test('web-only startup accepts an independently configured server', () => {
  assert.deepEqual(startupIssues({}, 'web', 'realtime'), []);
  assert.match(startupIssues({ SERVER_PORT: 'bad' }, 'web', 'flexible').join('\n'), /SERVER_PORT/);
});

test('malformed browser configuration is reported before spawning', () => {
  const issues = startupIssues({ ...env, BYTEPLUS_MODEL_ENDPOINTS: '[]', SESSION_DURATION_SECONDS: '0', REACT_APP_AIGC_PROXY_HOST: 'javascript:alert(1)' }, 'all', 'flexible');
  assert.equal(issues.length, 3);
});

for (const mode of ['realtime', 'flexible']) {
  test(`${mode} exposes public configuration and excludes credentials`, () => {
    const result = webEnvironment({
      ...env, RTC_APP_KEY: 'private', BYTEPLUS_MODEL_ENDPOINT_ID: 'endpoint',
      OPENAI_API_KEY: 'private', AWS_SECRET_ACCESS_KEY: 'private', GOOGLE_CREDENTIALS_JSON: 'private',
      AVATAR_TOKEN: 'private', AKOOL_API_KEY: 'private', CUSTOM_LLM_API_KEY: 'private', ASKECHO_API_KEY: 'private',
      SERVER_PORT: '3101',
    }, mode, 3100);
    assert.equal(result.REACT_APP_RTC_APP_ID, 'test-app');
    assert.equal(result.REACT_APP_MODEL_ENDPOINT_ID, 'endpoint');
    assert.equal(result.REACT_APP_MODE, mode);
    assert.equal(result.PORT, '3100');
    assert.equal(result.SERVER_PORT, '3101');
    assert.equal(Object.values(result).includes('private'), false);
    assert.equal(result.BYTEPLUS_ACCESS_KEY_ID, undefined);
  });
}

test('automatic port selection skips occupied ports and the API port', async () => {
  const checked = [];
  const port = await selectWebPort({}, async value => { checked.push(value); return value > 3000; });
  assert.equal(port, 3002);
  assert.deepEqual(checked, [3000, 3002]);
  await assert.rejects(selectWebPort({ PORT: '3100' }, async () => false), /PORT 3100 is occupied/);
  await assert.rejects(selectWebPort({ PORT: '3001' }, async () => true), /matches SERVER_PORT/);
});

test('port probe observes an occupied listener and its release', async t => {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  t.after(() => listener.close());
  const port = listener.address().port;
  assert.equal(await portAvailable(port, '127.0.0.1'), false);
  await new Promise(resolve => listener.close(resolve));
  assert.equal(await portAvailable(port, '127.0.0.1'), true);
});

test('port probe checks wildcard listeners before selecting a loopback port', async t => {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '0.0.0.0', resolve));
  t.after(() => listener.close());
  assert.equal(await portAvailable(listener.address().port, '127.0.0.1'), false);
});

test('the launcher exits with a configuration summary before starting services', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rtc-demo-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [path.join(__dirname, 'dev.cjs'), 'realtime'], {
    env: { PATH: process.env.PATH, DEMO_ENV_FILE: path.join(directory, 'missing.env') },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /RTC_APP_ID/);
  assert.match(result.stderr, /OPENAI_API_KEY/);
  assert.match(result.stderr, /missing.env/);
  assert.doesNotMatch(result.stderr, /at main|node:internal/);
});

test('logs retain warnings, partial lines and source labels', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = '';
  output.on('data', chunk => { text += chunk; });
  const lines = prefixOutput(input, 'web', output);
  const closed = new Promise(resolve => lines.on('close', resolve));
  input.write('warn');
  input.end('ing\n\nerror');
  await closed;
  assert.equal(text, '[web] warning\n[web] error\n');
});

function launch(platform = 'darwin') {
  const calls = [];
  const killed = [];
  const proc = Object.assign(new EventEmitter(), {
    execPath: process.execPath, platform, stdout: new PassThrough(), stderr: new PassThrough(),
    kill: (...args) => killed.push(args),
  });
  const result = startChildren(['server', 'web'].map(name => ({ name, args: ['entry.js'], env: {} })), {
    proc,
    spawnImpl(command, args, options) {
      const child = Object.assign(new EventEmitter(), {
        pid: calls.length + 100, stdout: new PassThrough(), stderr: new PassThrough(),
      });
      calls.push({ command, args, options, child });
      return child;
    },
  });
  return { calls, killed, proc, ...result };
}

test('child failure terminates both process groups and preserves the exit code', () => {
  const { calls, killed, proc } = launch();
  calls[0].child.emit('exit', 2);
  assert.deepEqual(killed, [[-100, 'SIGTERM'], [-101, 'SIGTERM']]);
  assert.equal(proc.exitCode, 2);
  proc.emit('SIGTERM');
  assert.equal(killed.length, 2);
});

test('an unexpected successful child exit reports startup failure', () => {
  const { calls, proc } = launch();
  calls[1].child.emit('exit', 0);
  assert.equal(proc.exitCode, 1);
});

test('Windows shutdown terminates both process trees', () => {
  const { calls, killed, proc } = launch('win32');
  assert.equal(calls[0].command, process.execPath);
  proc.emit('SIGINT');
  assert.deepEqual(killed, []);
  assert.equal(calls[2].command, 'taskkill.exe');
  assert.deepEqual(calls[2].args, ['/PID', '100', '/T', '/F']);
  assert.deepEqual(calls[3].args, ['/PID', '101', '/T', '/F']);
  assert.equal(proc.exitCode, 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`repeated ${signal} waits for service shutdown and releases its port`, {
    skip: process.platform === 'win32', timeout: 10000,
  }, async t => {
    const service = `
      const server = require('node:net').createServer();
      server.listen(0, '127.0.0.1', () => console.log('ready:' + server.address().port));
      process.once('SIGTERM', () => {
        console.log('stopping');
        setTimeout(() => server.close(), 300);
      });
    `;
    const launcher = spawn(process.execPath, ['-e', `
      const { startChildren } = require('./scripts/dev.cjs');
      const { children } = startChildren([{ name: 'server', args: ['-e', ${JSON.stringify(service)}], env: {} }]);
      const child = children[0].child;
      process.send({ pid: child.pid });
      require('node:readline').createInterface({ input: child.stdout }).on('line', line => {
        if (line.startsWith('ready:')) process.send({ port: Number(line.slice(6)) });
        if (line === 'stopping') process.send({ stopping: true });
      });
    `], { cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let servicePid;
    let port;
    let errors = '';
    launcher.stderr.on('data', chunk => { errors += chunk; });
    t.after(() => {
      if (launcher.exitCode === null && launcher.signalCode === null) launcher.kill('SIGKILL');
      if (servicePid) {
        try { process.kill(-servicePid, 'SIGKILL'); }
        catch (error) { if (error.code !== 'ESRCH') throw error; }
      }
    });
    launcher.on('message', message => {
      if (message.pid) servicePid = message.pid;
      if (message.port) {
        port = message.port;
        launcher.kill(signal);
      }
      if (message.stopping) launcher.kill(signal);
    });
    const result = await new Promise((resolve, reject) => {
      launcher.once('error', reject);
      launcher.once('exit', (code, receivedSignal) => resolve({ code, receivedSignal }));
    });
    assert.deepEqual(result, { code: 0, receivedSignal: null }, errors);
    assert.ok(port);
    assert.equal(await portAvailable(port, '127.0.0.1'), true);
  });
}

test('development proxy matches the API listener and uses an explicit port', async () => {
  const { default: configure } = await import('../web/vite.config.mjs');
  const previous = { SERVER_PORT: process.env.SERVER_PORT, PORT: process.env.PORT, HOST: process.env.HOST };
  try {
    Object.assign(process.env, { SERVER_PORT: '3101', PORT: '3100', HOST: '127.0.0.1' });
    const config = configure({ mode: 'development' });
    assert.equal(config.server.proxy['/preflight'].target, 'http://127.0.0.1:3101');
    assert.equal(config.server.port, 3100);
    assert.equal(config.server.strictPort, true);
    assert.equal(config.envPrefix, 'REACT_APP_');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
