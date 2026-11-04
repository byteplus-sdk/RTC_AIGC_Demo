const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { waitForWindowsShutdown } = require('./server-dev.cjs');

for (const order of ['signal-first', 'exit-first']) {
  test(`Windows watcher waits for backend cleanup (${order})`, () => {
    const monitor = new EventEmitter();
    const exits = [];
    const proc = Object.assign(new EventEmitter(), { exit: code => exits.push(code) });
    waitForWindowsShutdown(monitor, proc);
    monitor.emit('start');
    if (order === 'signal-first') {
      proc.emit('SIGBREAK');
      proc.emit('SIGBREAK');
      assert.deepEqual(exits, []);
      monitor.emit('exit');
    } else {
      monitor.emit('exit');
      assert.deepEqual(exits, []);
      proc.emit('SIGBREAK');
    }
    assert.deepEqual(exits, [0]);
  });
}

test('Windows watcher waits for the restarted backend', () => {
  const monitor = new EventEmitter();
  const exits = [];
  const proc = Object.assign(new EventEmitter(), { exit: code => exits.push(code) });
  waitForWindowsShutdown(monitor, proc);
  monitor.emit('exit');
  monitor.emit('start');
  proc.emit('SIGBREAK');
  assert.deepEqual(exits, []);
  monitor.emit('exit');
  assert.deepEqual(exits, [0]);
});

for (const event of ['crash', 'error']) {
  for (const stopping of [false, true]) {
    test(`Windows watcher fails on ${event} (stopping=${stopping})`, () => {
      const monitor = new EventEmitter();
      const exits = [];
      const proc = Object.assign(new EventEmitter(), { exit: code => exits.push(code) });
      waitForWindowsShutdown(monitor, proc);
      monitor.emit('start');
      if (stopping) proc.emit('SIGBREAK');
      monitor.emit(event);
      assert.deepEqual(exits, [1]);
    });
  }
}

test('Windows shutdown disables restarts before waiting for backend cleanup', () => {
  const monitor = new EventEmitter();
  const exits = [];
  let stopped = 0;
  const proc = Object.assign(new EventEmitter(), { exit: code => exits.push(code) });
  waitForWindowsShutdown(monitor, proc, () => { stopped++; });
  monitor.emit('start');
  proc.emit('SIGBREAK');
  proc.emit('SIGBREAK');
  assert.equal(stopped, 1);
  assert.deepEqual(exits, []);
  monitor.emit('exit');
  assert.deepEqual(exits, [0]);
});
