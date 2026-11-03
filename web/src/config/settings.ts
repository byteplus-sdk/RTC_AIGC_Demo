import config from '@/config';
import { Provider } from './basic';
import { buildAiGatewayParams, type AiGatewaySettings, type SpeechModule } from './voiceChat/aiGateway';

export const getSettings = () => ({
  'Provider.LLM': config['Provider.LLM'],
  'Provider.TTS': config['Provider.TTS'],
  'Provider.ASR': config['Provider.ASR'],
  'Provider.Avatar': config['Provider.Avatar'],
  aiGateway: config.aiGateway,
  avatar: config.avatar,
  VisionEnable: config.VisionEnable,
  VisionSourceType: config.VisionSourceType,
  Model: config.Model,
  CustomModelURL: config.CustomModelURL,
  ThinkingType: config.ThinkingType,
  BackgroundUrl: config.BackgroundUrl,
  voice: config.voice,
  endPointId: config.endPointId,
  WelcomeMessage: config.WelcomeMessage,
  SystemMessages: [...config.SystemMessages],
  SeedAsrVersion: config.SeedAsrVersion,
  SeedTtsVersion: config.SeedTtsVersion,
  AsrLanguage: config.AsrLanguage,
});

export const getConfigSnapshot = () => ({
  ...getSettings(),
  LLMWebSearchEnabled: config.LLMWebSearchEnabled,
  CustomMcpList: config.CustomMcpList.map((item) => ({ ...item })),
});

function serializeGatewayParams(settings: AiGatewaySettings, module: SpeechModule) {
  return JSON.stringify(buildAiGatewayParams(settings, module), (_, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]))
      : value
  );
}

export function getSettingsToApply(
  draft: ReturnType<typeof getSettings>,
  current: ReturnType<typeof getSettings>
) {
  const aiGateway = { ...current.aiGateway };
  for (const module of ['ASR', 'TTS'] as const) {
    const provider = `Provider.${module}` as const;
    if (draft[provider] !== Provider.AiGateway) continue;
    const params = serializeGatewayParams(draft.aiGateway[module], module);
    if (
      current[provider] !== Provider.AiGateway ||
      params !== serializeGatewayParams(current.aiGateway[module], module)
    ) {
      aiGateway[module] = draft.aiGateway[module];
    }
  }
  return { ...draft, aiGateway };
}
