const path = require('node:path');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const serverRequire = createRequire(path.join(root, 'server/package.json'));
serverRequire('dotenv').config({ path: path.join(root, '.env.local') });
const env = process.env;
const mode = process.argv[2] || 'realtime';
if (!['realtime', 'flexible', 'web'].includes(mode)) throw new Error('Unknown development mode');
const webEnv = Object.fromEntries(
  Object.entries(env).filter(([key]) =>
    !key.startsWith('BYTEPLUS_') &&
    !key.startsWith('OPENAI_') &&
    !key.startsWith('AWS_') &&
    !key.startsWith('GOOGLE_') &&
    !key.startsWith('AVATAR_') &&
    !key.startsWith('AKOOL_') &&
    !key.startsWith('CUSTOM_LLM_') &&
    key !== 'ASKECHO_API_KEY' && key !== 'RTC_APP_KEY' && key !== 'RTC_APP_ID'
  )
);
Object.assign(webEnv, {
  REACT_APP_RTC_APP_ID: env.RTC_APP_ID || '',
  REACT_APP_MODEL_ENDPOINT_ID: env.BYTEPLUS_MODEL_ENDPOINT_ID || '',
  BROWSER: env.BROWSER || 'none',
});
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
const detached = process.platform !== 'win32';
function run(args, cwd, childEnv) {
  return spawn(npm, args, {
    cwd: path.join(root, cwd), env: childEnv, stdio: 'inherit',
    detached, shell: !detached,
  });
}
if (mode !== 'web') {
  children.push(run(['run', 'dev'], 'server', env));
}
children.push(run(['run', `dev:${mode === 'web' ? 'realtime' : mode}`], 'web', webEnv));
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (!child.pid) return;
    try {
      if (detached) process.kill(-child.pid, 'SIGTERM');
      else {
        const cleanup = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
        });
        cleanup.on('error', (error) => {
          console.error(error.message);
          process.exitCode = 1;
        });
      }
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  });
  process.exitCode = code;
}
children.forEach((child) => {
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => stop(code === null ? 1 : code));
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
