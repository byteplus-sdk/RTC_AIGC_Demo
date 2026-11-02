const audioFields = ['OutputAudioPitchRate', 'OutputAudioSpeedRate', 'OutputAudioVolume'];

export function validateAiGatewayParams(params = {}, module) {
  const prefix = `${module} AI Gateway`;
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error(`${prefix} ProviderParams must be a JSON object`);
  }
  const allowed = ['ExtraData', 'ExtraHeader'];
  if (module === 'TTS') allowed.push('Voice', ...audioFields);
  if (Object.keys(params).some((key) => !allowed.includes(key))) {
    throw new Error(`${prefix} accepts only session parameters. Configure the URL and API key on the server.`);
  }
  if (module === 'TTS') {
    if (typeof params.Voice !== 'string' || !params.Voice.trim()) {
      throw new Error(`${prefix} requires a voice`);
    }
    for (const field of audioFields) {
      if (params[field] !== undefined && !Number.isFinite(params[field])) {
        throw new Error(`${prefix} ${field} must be a finite number`);
      }
    }
  }
}
