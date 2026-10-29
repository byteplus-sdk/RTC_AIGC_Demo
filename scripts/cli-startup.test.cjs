const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { portAvailable } = require('./dev.cjs');

test('CLI startup applies selected ports and the project environment before validation', { timeout: 20000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rtc-cli-startup-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const listeners = [];
  t.after(() => listeners.forEach(listener => listener.close()));
  for (let index = 0; index < 3; index++) {
    const listener = net.createServer();
    await new Promise((resolve, reject) => {
      listener.once('error', reject);
      listener.listen(0, '127.0.0.1', resolve);
    });
    listeners.push(listener);
  }
  const [occupiedPort, webPort, serverPort] = listeners.map(listener => listener.address().port);
  await Promise.all(listeners.slice(1).map(listener => new Promise(resolve => listener.close(resolve))));
  const envFile = path.join(directory, 'project.env');
  fs.writeFileSync(envFile, [
    'RTC_APP_ID=cli-startup-app',
    `PORT=${occupiedPort}`,
    `SERVER_PORT=${occupiedPort}`,
  ].join('\n'));
  const child = spawn(process.execPath, [path.join(__dirname, 'dev.cjs'), 'flexible'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      PATH: process.env.PATH,
      BYTEPLUS_RTC_CLI_PATH: process.execPath,
      BYTEPLUS_RTC_PROJECT_DIR: directory,
      BYTEPLUS_RTC_ENV_FILE: envFile,
      DEMO_ENV_FILE: path.join(directory, 'unused.env'),
      CONVO_CLI_WEB_PORT: String(webPort),
      CONVO_CLI_SERVER_PORT: String(serverPort),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const exited = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await exited;
    }
  });
  let ready = false;
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      const health = await fetch(`http://127.0.0.1:${serverPort}/health`);
      assert.deepEqual(await health.json(), { ok: true, agentMode: 'cli' });
      const runtime = await fetch(`http://127.0.0.1:${webPort}/runtimeConfig`);
      assert.deepEqual(await runtime.json(), { Result: { appId: 'cli-startup-app' } });
      const page = await fetch(`http://127.0.0.1:${webPort}/`);
      assert.match(await page.text(), /src\/index\.tsx/);
      ready = true;
      break;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  assert.equal(ready, true, output);
  child.kill('SIGTERM');
  assert.deepEqual(await exited, { code: 0, signal: null }, output);
  assert.equal(await portAvailable(webPort, '127.0.0.1'), true);
  assert.equal(await portAvailable(serverPort, '127.0.0.1'), true);
});
