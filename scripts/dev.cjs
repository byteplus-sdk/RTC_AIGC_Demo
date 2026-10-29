const path = require('node:path');
const net = require('node:net');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { configIssues, loadConfig } = require('../server/config');

const root = path.resolve(__dirname, '..');
const serverRequire = createRequire(path.join(root, 'server/package.json'));
const webRequire = createRequire(path.join(root, 'web/package.json'));

function packageBin(requireFrom, name, command) {
  const manifest = requireFrom.resolve(`${name}/package.json`);
  const { bin } = requireFrom(manifest);
  return requireFrom.resolve(path.resolve(path.dirname(manifest), typeof bin === 'string' ? bin : bin[command]));
}

function startupIssues(env, target, mode) {
  const issues = target === 'web' ? [] : configIssues(env);
  if (target === 'all' && mode === 'realtime' && !env.OPENAI_API_KEY?.trim()) {
    issues.push('OPENAI_API_KEY is required for Realtime');
  }
  if (target !== 'server') {
    for (const key of ['PORT', 'SERVER_PORT']) {
      if (key === 'SERVER_PORT' && target !== 'web') continue;
      const value = env[key]?.trim();
      if (value && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)) {
        issues.push(`${key} must be an integer between 1 and 65535`);
      }
    }
    if (env.BYTEPLUS_MODEL_ENDPOINTS?.trim()) {
      try {
        const endpoints = JSON.parse(env.BYTEPLUS_MODEL_ENDPOINTS);
        if (!endpoints || Array.isArray(endpoints) || typeof endpoints !== 'object' ||
            Object.values(endpoints).some(value => typeof value !== 'string')) throw new Error();
      } catch { issues.push('BYTEPLUS_MODEL_ENDPOINTS must be a JSON object with string values'); }
    }
    if (env.SESSION_DURATION_SECONDS?.trim() &&
        (!Number.isInteger(Number(env.SESSION_DURATION_SECONDS)) || Number(env.SESSION_DURATION_SECONDS) <= 0)) {
      issues.push('SESSION_DURATION_SECONDS must be a positive integer');
    }
    if (env.REACT_APP_AIGC_PROXY_HOST?.trim()) {
      try {
        const url = new URL(env.REACT_APP_AIGC_PROXY_HOST);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
      } catch { issues.push('REACT_APP_AIGC_PROXY_HOST must be an HTTP(S) URL without credentials'); }
    }
  }
  return [...new Set(issues)];
}

function webEnvironment(env, mode, port) {
  const result = Object.fromEntries(Object.entries(env).filter(([key]) =>
    !/^(BYTEPLUS_|OPENAI_|AWS_|GOOGLE_|AVATAR_|AKOOL_|CUSTOM_LLM_)/.test(key) &&
    !['ASKECHO_API_KEY', 'RTC_APP_KEY', 'RTC_APP_ID'].includes(key)
  ));
  return Object.assign(result, {
    REACT_APP_AIGC_PROXY_HOST: env.REACT_APP_AIGC_PROXY_HOST || '',
    REACT_APP_RTC_APP_ID: env.RTC_APP_ID || '',
    REACT_APP_MODEL_ENDPOINT_ID: env.BYTEPLUS_MODEL_ENDPOINT_ID || '',
    REACT_APP_CUSTOM_LLM_URL: env.CUSTOM_LLM_URL || '',
    REACT_APP_MODEL_ENDPOINTS: env.BYTEPLUS_MODEL_ENDPOINTS || '{}',
    REACT_APP_SESSION_DURATION_SECONDS: env.SESSION_DURATION_SECONDS || '1800',
    REACT_APP_MODE: mode,
    PORT: String(port),
    SERVER_PORT: env.SERVER_PORT || '3001',
    HOST: env.HOST?.trim() || '127.0.0.1',
    BROWSER: env.BROWSER || 'none',
  });
}

function canListen(port, host) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
    probe.listen({ port, host, exclusive: true }, () => probe.close(() => resolve(true)));
  });
}

async function portAvailable(port, host) {
  const companion = { '127.0.0.1': '0.0.0.0', '0.0.0.0': '127.0.0.1', '::1': '::', '::': '::1' }[host];
  if (!await canListen(port, host)) return false;
  return companion ? canListen(port, companion) : true;
}

async function selectWebPort(env, available = portAvailable) {
  const explicit = Boolean(env.PORT?.trim());
  const start = explicit ? Number(env.PORT) : 3000;
  const host = env.HOST?.trim() || '127.0.0.1';
  const serverPort = Number(env.SERVER_PORT || 3001);
  for (let port = start; port <= Math.min(start + (explicit ? 0 : 99), 65535); port++) {
    if (port !== serverPort && await available(port, host)) return port;
  }
  if (explicit) throw new Error(`PORT ${start} is occupied or matches SERVER_PORT. Set another PORT in the environment file, or leave PORT empty for automatic selection.`);
  throw new Error('No available web port in 3000–3099. Set PORT in the environment file.');
}

function prefixOutput(stream, label, output) {
  return readline.createInterface({ input: stream }).on('line', line => {
    if (line.trim()) output.write(`[${label}] ${line}\n`);
  });
}

function startChildren(specs, { spawnImpl = spawn, proc = process } = {}) {
  const children = [];
  const detached = proc.platform !== 'win32';
  let stopping = false;
  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    proc.exitCode = code;
    for (const { child } of children) {
      if (!child.pid) continue;
      try {
        if (detached) proc.kill(-child.pid, 'SIGTERM');
        else {
          const cleanup = spawnImpl('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
          cleanup.on('error', error => { console.error(`[dev] ${error.message}`); proc.exitCode = 1; });
        }
      } catch (error) {
        if (error.code !== 'ESRCH') { console.error(`[dev] ${error.message}`); proc.exitCode = 1; }
      }
    }
  }
  for (const spec of specs) {
    const child = spawnImpl(proc.execPath, spec.args, {
      cwd: path.join(root, spec.name), env: spec.env,
      stdio: ['ignore', 'pipe', 'pipe'], detached,
    });
    children.push({ child, name: spec.name });
    prefixOutput(child.stdout, spec.name, proc.stdout);
    prefixOutput(child.stderr, spec.name, proc.stderr);
    child.once('error', error => { console.error(`[${spec.name}] ${error.message}`); stop(1); });
    child.once('exit', (code, signal) => {
      if (stopping) return;
      console.error(`[${spec.name}] Exited (${signal || code}). Restart with npm run dev:${spec.name}.`);
      stop(code || 1);
    });
  }
  proc.on('SIGINT', () => stop());
  proc.on('SIGTERM', () => stop());
  return { children, stop };
}

async function main(args = process.argv.slice(2)) {
  const target = ['server', 'web'].includes(args[0]) ? args[0] : 'all';
  const mode = target === 'all' ? args[0] || 'realtime' : args[1] || 'realtime';
  if (!['realtime', 'flexible'].includes(mode) || args.length > (target === 'all' ? 1 : 2)) {
    throw new Error('Usage: node scripts/dev.cjs [flexible|realtime|web [flexible|realtime]|server]');
  }
  const envFile = path.resolve(process.env.BYTEPLUS_RTC_ENV_FILE || process.env.DEMO_ENV_FILE || path.join(root, '.env.local'));
  let dotenv;
  try { dotenv = serverRequire('dotenv'); }
  catch { throw new Error('Dependencies are missing. Run npm run setup in the repository root.'); }
  const loaded = dotenv.config({ path: envFile });
  if (loaded.error && loaded.error.code !== 'ENOENT') throw new Error(`Cannot read configuration file: ${envFile}`);
  const env = { ...process.env, DEMO_ENV_FILE: envFile };
  if (env.CONVO_CLI_WEB_PORT) env.PORT = env.CONVO_CLI_WEB_PORT;
  if (env.CONVO_CLI_SERVER_PORT) env.SERVER_PORT = env.CONVO_CLI_SERVER_PORT;
  const issues = startupIssues(env, target, mode);
  if (issues.length) {
    throw new Error(`Configuration: ${envFile}\n${issues.map(issue => `  - ${issue}`).join('\n')}\nUse .env.example for field definitions.`);
  }
  const specs = [];
  let config;
  if (target !== 'web') {
    config = loadConfig(env);
    if (!await portAvailable(config.port, config.host)) {
      throw new Error(`SERVER_PORT ${config.port} is occupied. Stop the existing server or set another SERVER_PORT in the environment file.`);
    }
    try {
      specs.push({ name: 'server', args: [packageBin(serverRequire, 'nodemon', 'nodemon'), '--quiet', '--signal', 'SIGTERM', '--exitcrash', 'app.js'], env });
    } catch { throw new Error('Server dependencies are missing. Run npm run setup in the repository root.'); }
  }
  let port;
  if (target !== 'server') {
    port = await selectWebPort(env);
    try {
      specs.push({ name: 'web', args: [packageBin(webRequire, 'vite', 'vite'), '--clearScreen', 'false'], env: webEnvironment(env, mode, port) });
    } catch { throw new Error('Web dependencies are missing. Run npm run setup in the repository root.'); }
  }
  console.log(`[dev] ${target === 'server' ? 'Starting API server' : `Mode: ${mode}`}`);
  console.log(`[dev] Configuration: ${envFile}${loaded.error ? ' (using environment variables)' : ''}`);
  if (port && !env.PORT?.trim() && port !== 3000) {
    console.log(`[web] Default port unavailable; selected ${port}.`);
  }
  if (target !== 'server' && mode === 'flexible') console.log('[dev] Provider credentials are checked when you select ASR, LLM and TTS in the app.');
  startChildren(specs);
}

if (require.main === module) {
  main().catch(error => { console.error(`[dev] ${error.message}`); process.exitCode = 1; });
}

module.exports = { startupIssues, webEnvironment, portAvailable, selectWebPort, prefixOutput, startChildren, main };
