const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const test = require('node:test');

const {
  injectEnvironmentSecrets,
  issueToken,
  loadRuntimeConfig,
  prepareAgentBody,
  runCLI,
} = require('./app');

function cliConfig() {
  const env = {
    RTC_APP_ID: 'test-app',
    BYTEPLUS_RTC_CLI_PATH: '/tmp/byteplus-rtc',
    BYTEPLUS_RTC_PROJECT_DIR: '/tmp/project',
  };
  return loadRuntimeConfig(env);
}

function successfulSpawn(data, inspect) {
  return (command, args, options) => {
    inspect?.({ command, args, options });
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => undefined;
    process.nextTick(() => {
      child.stdout.end(`${JSON.stringify({ ok: true, data })}\n`);
      child.emit('close', 0);
    });
    return child;
  };
}

function failedSpawn(errorEnvelope) {
  return () => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => undefined;
    process.nextTick(() => {
      child.stderr.end(`progress that may contain secret-material\n${JSON.stringify(errorEnvelope)}\n`);
      child.emit('close', 1);
    });
    return child;
  };
}

test('CLI mode requires no long-term AK/SK', () => {
  const config = cliConfig();
  assert.equal(config.mode, 'cli');
  assert.equal(config.appId, 'test-app');
});

test('partial AK/SK configuration fails closed', () => {
  assert.throws(
    () => loadRuntimeConfig({ RTC_APP_ID: 'test-app', BYTEPLUS_ACCESS_KEY_ID: 'ak' }),
    /must be set together/
  );
});

test('CLI JSON transport uses the configured binary and project', async () => {
  let call;
  const result = await runCLI(
    cliConfig(),
    ['agent', 'start', '--runtime-request-stdin'],
    { AppId: 'test-app' },
    successfulSpawn({ status: 'running' }, (value) => {
      call = value;
    })
  );
  assert.deepEqual(result, { status: 'running' });
  assert.equal(call.command, '/tmp/byteplus-rtc');
  assert.deepEqual(call.args, ['--format=json', 'agent', 'start', '--runtime-request-stdin']);
  assert.equal(call.options.cwd, '/tmp/project');
});

test('token issuance delegates matching room and user to byteplus-rtc', async () => {
  let args;
  const token = await issueToken(
    cliConfig(),
    { appID: 'test-app', roomID: 'room-1', userID: 'user-1' },
    {
      spawnImpl: successfulSpawn({ token: 'sanitized-token' }, (call) => {
        args = call.args;
      }),
    }
  );
  assert.equal(token, 'sanitized-token');
  assert.deepEqual(args, [
    '--format=json',
    'token',
    'issue',
    '--room-id',
    'room-1',
    '--user-id',
    'user-1',
  ]);
});

test('CLI failures expose the typed message without leaking stderr', async () => {
  await assert.rejects(
    () =>
      runCLI(
        cliConfig(),
        ['token', 'issue'],
        undefined,
        failedSpawn({
          ok: false,
          error: {
            code: 'byteplus-rtc.config.not_found',
            message: 'byteplus-rtc.config.yaml not found',
          },
        })
      ),
    (error) => {
      assert.match(error.message, /byteplus-rtc\.config\.not_found: byteplus-rtc\.config\.yaml not found/);
      assert.doesNotMatch(error.message, /secret-material/);
      return true;
    }
  );
});

test('environment injection pins the verified BytePlus provider fields', () => {
  const body = {
    Config: {
      ASRConfig: { Provider: 'BytePlus', ProviderParams: {} },
      LLMConfig: { Mode: 'BytePlusArk' },
      TTSConfig: { Provider: 'byteplus_Bidirectional_streaming', ProviderParams: {} },
    },
  };
  injectEnvironmentSecrets(body, {
    BYTEPLUS_SEED_SPEECH_APP_ID: 'speech-app',
    BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN: 'speech-token',
    BYTEPLUS_MODEL_ENDPOINT_ID: 'model-endpoint',
    BYTEPLUS_MODEL_API_KEY: 'model-key',
  });
  assert.equal(body.Config.ASRConfig.ProviderParams.AppId, 'speech-app');
  assert.equal(body.Config.LLMConfig.EndPointId, 'model-endpoint');
  assert.equal(body.Config.TTSConfig.ProviderParams.app.token, 'speech-token');
});

test('CLI-mode app does not inject provider secrets in the Node process', async () => {
  const config = cliConfig();
  config.env = {
    ...config.env,
    BYTEPLUS_SEED_SPEECH_APP_ID: 'selector-only',
    BYTEPLUS_MODEL_ENDPOINT_ID: 'endpoint-only',
  };
  const body = {
    Config: {
      ASRConfig: { Provider: 'BytePlus', ProviderParams: {} },
      LLMConfig: { Mode: 'BytePlusArk' },
      TTSConfig: { Provider: 'byteplus_Bidirectional_streaming', ProviderParams: {} },
    },
  };
  prepareAgentBody(config, 'StartVoiceChat', body);
  assert.equal(body.Config.ASRConfig.ProviderParams.AccessToken, undefined);
  assert.equal(body.Config.LLMConfig.APIKey, undefined);
  assert.equal(body.Config.TTSConfig.ProviderParams.app, undefined);
});
