const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function launch(mode, platform = 'darwin') {
  const calls = [];
  const killed = [];
  const handlers = {};
  let dotenvPath;
  const env = {
    RTC_APP_ID: 'test-app', BYTEPLUS_MODEL_ENDPOINT_ID: 'test-endpoint',
    RTC_APP_KEY: 'private', BYTEPLUS_SECRET_ACCESS_KEY: 'private',
    OPENAI_API_KEY: 'private', AWS_SECRET_ACCESS_KEY: 'private',
    GOOGLE_CREDENTIALS_JSON: 'private', AVATAR_TOKEN: 'private',
    AKOOL_API_KEY: 'private', CUSTOM_LLM_API_KEY: 'private', ASKECHO_API_KEY: 'private',
    PORT: '3100', SERVER_PORT: '3101', PATH: '/usr/bin',
  };
  const proc = {
    env, platform, argv: ['node', 'dev.cjs', mode],
    on: (event, handler) => { handlers[event] = handler; },
    kill: (...args) => killed.push(args),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'dev.cjs'), 'utf8'), {
    __dirname, process: proc, console,
    require(name) {
      if (name === 'node:module') return {
        createRequire: () => () => ({ config: ({ path: file }) => { dotenvPath = file; } }),
      };
      if (name === 'node:child_process') return {
        spawn(command, args, options) {
          const child = Object.assign(new EventEmitter(), {
            pid: calls.length + 100, kill: (...args) => killed.push(args),
          });
          calls.push({ command, args, options, child });
          return child;
        },
      };
      return require(name);
    },
  });
  return { calls, killed, handlers, proc, dotenvPath };
}

for (const mode of ['realtime', 'flexible', 'web']) {
  test(`${mode} uses the root environment and exposes public settings to the web process`, () => {
    const { calls, dotenvPath } = launch(mode);
    assert.equal(dotenvPath, path.resolve(__dirname, '../.env.local'));
    assert.equal(calls.length, mode === 'web' ? 1 : 2);
    const web = calls.at(-1);
    assert.deepEqual(Array.from(web.args), ['run', `dev:${mode === 'web' ? 'realtime' : mode}`]);
    assert.equal(web.options.env.REACT_APP_RTC_APP_ID, 'test-app');
    assert.equal(web.options.env.REACT_APP_MODEL_ENDPOINT_ID, 'test-endpoint');
    assert.equal(web.options.env.PORT, '3100');
    assert.equal(web.options.env.SERVER_PORT, '3101');
    assert.equal(Object.values(web.options.env).includes('private'), false);
    if (mode !== 'web') {
      assert.deepEqual(Array.from(calls[0].args), ['run', 'dev']);
      assert.equal(calls[0].options.env.RTC_APP_KEY, 'private');
    }
  });
}

test('shutdown terminates both process groups and preserves failure status', () => {
  const { calls, killed, handlers, proc } = launch('flexible');
  calls[0].child.emit('exit', 2);
  assert.deepEqual(killed, [[-100, 'SIGTERM'], [-101, 'SIGTERM']]);
  assert.equal(proc.exitCode, 2);
  handlers.SIGTERM();
  assert.equal(killed.length, 2);
});

test('Windows shutdown requests termination of both process trees', () => {
  const { killed, handlers, calls } = launch('flexible', 'win32');
  assert.equal(calls[0].options.shell, true);
  handlers.SIGINT();
  assert.deepEqual(killed, []);
  assert.equal(calls.length, 4);
  assert.equal(calls[2].command, 'taskkill.exe');
  assert.equal(calls[3].command, 'taskkill.exe');
  assert.deepEqual(Array.from(calls[2].args), ['/PID', '100', '/T', '/F']);
  assert.deepEqual(Array.from(calls[3].args), ['/PID', '101', '/T', '/F']);
});
