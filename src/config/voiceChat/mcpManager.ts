/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider, isLlmProviderAllowedForVoiceChatMcp } from '../basic';

export type LlmCustomMcpEntry = { Name: string; URL: string };

export const DEFAULT_LLM_MCP_COMFORT_WORDS = 'Processing your request';

export const VOICE_CHAT_MCP_SUPPORT_HINT =
  'MCP is only available for ModelArk (Byteplus) and Custom LLM.';

export type VoiceChatMcpItem = { Name: string; URL: string; ComfortWords: string };

/** Dedupes by MCP `Name` (last row wins). */
export function buildVoiceChatMcpItems(list: LlmCustomMcpEntry[]): VoiceChatMcpItem[] {
  const byName = new Map<string, VoiceChatMcpItem>();
  for (const c of list) {
    const n = c.Name?.trim();
    const u = c.URL?.trim();
    if (n && u) {
      byName.set(n, {
        Name: n,
        URL: u,
        ComfortWords: DEFAULT_LLM_MCP_COMFORT_WORDS,
      });
    }
  }
  return [...byName.values()];
}

/**
 * User MCP rows merged into `LLMConfig.MCP` on {@link LLMManager} output (parallel to {@link AvatarManager}).
 */
export class McpManager {
  customMcpList: LlmCustomMcpEntry[] = [];

  /** Mutates `llmRow` (same object as `LLMManager` `#paramsMap` entry) to attach or strip `MCP`. */
  applyToLlmRow(provider: Provider, llmRow: object): void {
    const row = llmRow as { MCP?: VoiceChatMcpItem[] };
    if (!isLlmProviderAllowedForVoiceChatMcp(provider)) {
      delete row.MCP;
      return;
    }
    const items = buildVoiceChatMcpItems(this.customMcpList);
    if (items.length) {
      row.MCP = items;
    } else {
      delete row.MCP;
    }
  }
}
