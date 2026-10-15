/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

/**
 * AskEcho Search Agent for StartVoiceChat `Config.WebSearchAgentConfig`.
 * @see https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1856161
 */
export const ASKECHO_SEARCH_AGENT_BOT_ID = 'Your AskEcho Bot ID';

/** Tool + system policy: when the main LLM may invoke web_search (AskEcho). */
export const WEB_SEARCH_AGENT_INSTRUCTIONS_EN = [
  `Used to query time-sensitive information, such as today's weather or the latest news events.`,
].join('\n');

export type WebSearchAgentConfigPayload = {
  Enable: boolean;
  ParamsString: string;
  APIKey: string;
  FunctionName: string;
  FunctionDescription: string;
  ComfortWords: string;
};

/** ParamsString: ChatCompletionRequest-style body (bot_id + stream) per BytePlus doc. */
export function createWebSearchAgentConfig(): WebSearchAgentConfigPayload {
  return {
    Enable: true,
    ParamsString: JSON.stringify({
      bot_id: ASKECHO_SEARCH_AGENT_BOT_ID,
      stream: true,
    }),
    APIKey: '',
    FunctionName: 'web_search',
    FunctionDescription: WEB_SEARCH_AGENT_INSTRUCTIONS_EN,
    ComfortWords: 'Searching online for you, please wait a moment.',
  };
}
