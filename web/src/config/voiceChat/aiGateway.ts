import { isJsonObject, validateAiGatewayParams } from '../../../../shared/aiGateway.mjs';

export interface AiGatewaySettings {
  Voice?: string;
  ExtraData?: string;
  ExtraHeader?: string;
  OutputAudioPitchRate?: string;
  OutputAudioSpeedRate?: string;
  OutputAudioVolume?: string;
}

export type SpeechModule = 'ASR' | 'TTS';

export class GatewayJsonError extends SyntaxError {
  constructor(readonly module: SpeechModule, readonly field: 'ExtraData' | 'ExtraHeader') {
    super(`Enter a JSON object for ${module} ${field}.`);
  }
}

export function buildAiGatewayParams(settings: AiGatewaySettings, module: SpeechModule) {
  const params: Record<string, unknown> = {};
  for (const field of ['ExtraData', 'ExtraHeader'] as const) {
    try {
      params[field] = JSON.parse(settings[field]?.trim() || '{}');
    } catch {
      throw new GatewayJsonError(module, field);
    }
    if (!isJsonObject(params[field])) throw new GatewayJsonError(module, field);
  }
  if (module === 'TTS') {
    params.Voice = settings.Voice?.trim();
    for (const field of [
      'OutputAudioPitchRate',
      'OutputAudioSpeedRate',
      'OutputAudioVolume',
    ] as const) {
      if (settings[field]?.trim()) params[field] = Number(settings[field]);
    }
  }
  validateAiGatewayParams(params, module);
  return params;
}
