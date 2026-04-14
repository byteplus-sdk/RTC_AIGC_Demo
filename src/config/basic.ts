/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

export enum Provider {
  None = 'none',
  OpenAI = 'openai',
  Amazon = 'amazon',
  /** TTS / other integrations (value `google`). */
  Google = 'google',
  /**
   * Google Cloud Speech-to-Text v1 — `ASRConfig.Provider` = `Google`.
   * @note ASR vendor only; use {@link Provider.Google} for TTS.
   */
  GoogleAsrV1 = 'Google',
  /**
   * Google Cloud Speech-to-Text v2 — `ASRConfig.Provider` = `GoogleV2`.
   * @note ASR vendor only.
   */
  GoogleAsrV2 = 'GoogleV2',
  Byteplus = 'BytePlusArk',
  CustomLLM = 'CustomLLM',
}

export enum ModuleType {
  LLM = 'llm',
  TTS = 'tts',
  ASR = 'asr',
  Avatar = 'avatar',
}

/**
 * Voice Chat ASR
 */
export const ASR_PROVIDER_OPTIONS = [
  { value: Provider.Byteplus, label: 'BytePlus' },
  { value: Provider.Amazon, label: 'Amazon' },
  { value: Provider.GoogleAsrV1, label: 'Google (Speech-to-Text v1)' },
  { value: Provider.GoogleAsrV2, label: 'Google (Speech-to-Text v2)' },
] as const;

/** AskEcho Web Search (`WebSearchAgentConfig`). */
export function isLlmProviderAllowedForWebSearch(provider: Provider): boolean {
  return provider === Provider.Byteplus || provider === Provider.CustomLLM;
}

/** `LLMConfig.MCP`: same LLM restriction as web search in this demo. */
export function isLlmProviderAllowedForVoiceChatMcp(provider: Provider): boolean {
  return isLlmProviderAllowedForWebSearch(provider);
}
