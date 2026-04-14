/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider, isLlmProviderAllowedForWebSearch } from '../basic';
import { createWebSearchAgentConfig, type WebSearchAgentConfigPayload } from './webSearchAgent';

/**
 * AskEcho Web Search for `StartVoiceChat` `Config.WebSearchAgentConfig` (parallel to {@link AvatarManager}).
 * API key is injected by Server/sensitive.js.
 */
export class WebSearchManager {
  /** When true, `Config.WebSearchAgentConfig` is included; proxy injects `APIKey`. */
  enabled = false;

  getPayload(llmProvider: Provider): WebSearchAgentConfigPayload | undefined {
    if (!this.enabled || !isLlmProviderAllowedForWebSearch(llmProvider)) {
      return undefined;
    }
    return createWebSearchAgentConfig();
  }
}
