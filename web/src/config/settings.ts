import config from '@/config';

export const getSettings = () => ({
  'Provider.LLM': config['Provider.LLM'],
  'Provider.TTS': config['Provider.TTS'],
  'Provider.ASR': config['Provider.ASR'],
  'Provider.Avatar': config['Provider.Avatar'],
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
