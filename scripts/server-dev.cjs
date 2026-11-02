const path = require('node:path');
const { createRequire } = require('node:module');

function waitForWindowsShutdown(monitor, proc = process, stopWatching = () => {}) {
  let stopping = false;
  let exited = false;
  monitor.on('crash', () => proc.exit(1));
  monitor.on('error', () => proc.exit(1));
  monitor.on('start', () => { exited = false; });
  monitor.on('exit', () => {
    exited = true;
    if (stopping) proc.exit(0);
  });
  proc.on('SIGBREAK', () => {
    if (stopping) return;
    stopping = true;
    stopWatching();
    if (exited) proc.exit(0);
  });
}

if (require.main === module) {
  const serverRequire = createRequire(path.join(__dirname, '../server/package.json'));
  const monitor = serverRequire('nodemon')({ script: 'app.js', quiet: true, signal: 'SIGTERM', exitcrash: true });
  waitForWindowsShutdown(monitor, process, () => {
    serverRequire('nodemon/lib/monitor/watch').resetWatchers();
    serverRequire('nodemon/lib/utils').bus.removeAllListeners('restart');
  });
}

module.exports = { waitForWindowsShutdown };
