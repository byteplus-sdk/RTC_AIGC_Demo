const https = require('node:https');
const { randomBytes, createHash } = require('node:crypto');

function probeSpeech(kind, config, env, request = https.request) {
  const params = config.ProviderParams || {};
  const resource = kind === 'ASR' ? params.ApiResourceId : params.ResourceId;
  if (!resource) throw new Error(`${kind} resource ID is required`);
  const path = kind === 'TTS' ? '/api/v3/tts/bidirection' :
    params.StreamMode === 2 ? '/api/v3/sauc/bigmodel_async' :
    params.StreamMode === 1 ? '/api/v3/sauc/bigmodel_nostream' : '/api/v3/sauc/bigmodel';
  const key = randomBytes(16).toString('base64');
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: 'voice.ap-southeast-1.bytepluses.com', path, method: 'GET',
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': key, 'X-Api-App-Key': env.BYTEPLUS_SEED_SPEECH_APP_ID,
        'X-Api-Access-Key': env.BYTEPLUS_SEED_SPEECH_ACCESS_TOKEN, 'X-Api-Resource-Id': resource },
    });
    const timer = setTimeout(() => req.destroy(new Error('connection check timed out')), 8000);
    req.on('upgrade', (res, socket) => {
      clearTimeout(timer); socket.destroy();
      const expected = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
      if (res.headers['sec-websocket-accept'] !== expected) reject(new Error('invalid WebSocket handshake'));
      else resolve();
    });
    req.on('response', res => {
      clearTimeout(timer); res.resume();
      reject(new Error(res.statusCode === 403 ? `${resource} is not authorized; activate the service in Seed Speech` : `connection check returned HTTP ${res.statusCode}`));
    });
    req.on('error', () => { clearTimeout(timer); reject(new Error('connection check failed; check service availability and credentials')); });
    req.end();
  });
}

async function preflight(action, body, env, { validate, probe = probeSpeech } = {}) {
  const issues = [];
  try {
    validate(action, body, env);
    if (action === 'StartVoiceChat' && (!body?.Config || !body.Config.LLMConfig || !body.Config.ASRConfig || !body.Config.TTSConfig)) throw new Error('ASR, LLM and TTS configuration are required');
    const llm = body?.Config?.LLMConfig;
    if (llm?.Provider === 'BytePlus' || llm?.Mode === 'BytePlusArk') {
      const endpoint = llm.EndPointId || env.BYTEPLUS_MODEL_ENDPOINT_ID;
      if (!endpoint?.trim() || /^Your\b/i.test(endpoint)) throw new Error('Select a ModelArk inference endpoint');
    }
    const avatar = body?.Config?.AvatarConfig;
    if (avatar?.Enabled && avatar.Provider === 'Akool' && !avatar.ProviderParams?.AvatarId?.trim()) throw new Error('Select an Akool Streaming Avatar ID');
  } catch (error) {
    return { ready: false, issues: [{ stage: 'configuration', message: error.message }] };
  }
  for (const kind of ['ASR', 'TTS']) {
    const config = body?.Config?.[`${kind}Config`];
    if (config?.Provider === 'BytePlus' || (kind === 'TTS' && config?.Provider === 'byteplus_Bidirectional_streaming')) {
      try { await probe(kind, config, env); }
      catch (error) { issues.push({ stage: kind.toLowerCase(), message: `${kind}: ${error.message}` }); }
    }
  }
  return { ready: issues.length === 0, issues };
}

module.exports = { preflight, probeSpeech };
