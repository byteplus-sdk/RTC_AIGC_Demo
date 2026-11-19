const { execFile } = require('node:child_process');

const { validateProviderConfig } = require('./providerConfig');
const { injectSensitiveInfo } = require('./sensitive');

function createCliRuntime(config, { env, signal, execFileImpl = execFile }) {
  function run(args, body) {
    signal?.throwIfAborted();
    const input = body === undefined ? undefined : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const options = { cwd: config.projectDir, env, signal, timeout: 30000, killSignal: 'SIGKILL', windowsHide: true };
      const child = execFileImpl(config.cliPath, ['--format=json', ...args], options, (error, stdout) => {
        let result;
        try {
          result = JSON.parse(stdout);
        } catch {
          reject(new Error(`CLI ${args[0]} ${args[1]} returned no valid JSON response`));
          return;
        }
        if (error || !result?.ok) {
          reject(new Error(result?.error?.message || `CLI ${args[0]} ${args[1]} failed`));
          return;
        }
        resolve(result.data);
      });
      child.stdin.on('error', () => {});
      child.stdin.end(input);
    });
  }

  function prepare(action, body) {
    if (action === 'StartVoiceChatWithRealtimeAPI') {
      validateProviderConfig(action, body, env);
      injectSensitiveInfo(body, false, { action, env });
    }
  }

  async function check(action, body) {
    try {
      if (action === 'StartVoiceChatWithRealtimeAPI') {
        validateProviderConfig(action, body, env);
        return { ready: true, issues: [] };
      }
      return await run(['agent', 'check', '--runtime-request-stdin'], body);
    } catch (error) {
      return { ready: false, issues: [{ stage: 'configuration', message: error.message }] };
    }
  }

  async function issueToken({ roomID, userID }) {
    const data = await run(['token', 'issue', '--room-id', roomID, '--user-id', userID]);
    if (!data?.token) throw new Error('CLI returned no RTC token');
    return data.token;
  }

  async function invoke(action, body) {
    if (action === 'StartVoiceChatWithRealtimeAPI' || action === 'StopVoiceChatWithRealtimeAPI') {
      const data = await run(['openapi', 'invoke', '--action', action, '--version', '2025-05-01', '--body', '@-'], body);
      if (data?.body?.Result !== 'ok') throw new Error('Unexpected CLI Realtime response');
      return data.body;
    }
    const start = action === 'StartVoiceChat';
    const data = await run(['agent', start ? 'start' : 'stop', '--runtime-request-stdin'], body);
    if (data?.status !== (start ? 'running' : 'stopped')) throw new Error('Unexpected CLI agent status');
    return { ResponseMetadata: { Action: action }, Result: 'ok' };
  }

  return { check, prepare, issueToken, invoke };
}

module.exports = { createCliRuntime };
