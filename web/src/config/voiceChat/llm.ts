/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider } from '../basic';
import ArkSVG from '@/assets/img/Ark.svg';

export { isLlmProviderAllowedForWebSearch, isLlmProviderAllowedForVoiceChatMcp } from '../basic';

export type { LlmCustomMcpEntry, VoiceChatMcpItem } from './mcpManager';
export {
  buildVoiceChatMcpItems,
  McpManager,
  DEFAULT_LLM_MCP_COMFORT_WORDS,
  VOICE_CHAT_MCP_SUPPORT_HINT,
} from './mcpManager';

export { WebSearchManager } from './webSearchManager';

/**
 * @note Ark Model IDs, visit following url to find endpoint column, set model ID you want to use.
 * @refer https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint
 */
export enum ModelNames {
  Seed21Turbo = 'Dola-Seed-2.1-turbo｜260628',
  Seed20Pro = 'Dola-Seed-2.0-pro｜260328',
  Seed20Mini = 'Dola-Seed-2.0-mini｜260215',
  Seed16Flash = 'ByteDance-Seed-1.6-flash｜250715',
  Seed16 = 'ByteDance-Seed-1.6｜250915',
  GPT4o = 'GPT-4o',
  GPT51 = 'GPT-5.1',
  Gemini25Flash = 'Gemini-2.5-flash',
  Gemini25Pro = 'Gemini-2.5-pro',
  Custom = 'Custom Model',
}

export enum THINKING_TYPE {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

const endpointMap: Record<string, string> = (() => {
  try {
    const value = JSON.parse(process.env.REACT_APP_MODEL_ENDPOINTS || '{}');
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    );
  } catch {
    return {};
  }
})();

export const ArkModel = Object.fromEntries(
  [
    ModelNames.Seed21Turbo,
    ModelNames.Seed20Pro,
    ModelNames.Seed20Mini,
    ModelNames.Seed16Flash,
    ModelNames.Seed16,
  ].map((name) => [
    name,
    {
      endPointId:
        endpointMap[name] ||
        (name === ModelNames.Seed21Turbo
          ? process.env.REACT_APP_MODEL_ENDPOINT_ID || 'Your model ID'
          : ''),
      description: 'Multimodal · Deep Thinking',
      icon: ArkSVG,
    },
  ])
);

export const OpenAiModel = {
  [ModelNames.GPT4o]: { endPointId: 'gpt-4o-2024-11-20', description: 'Multimodal' },
  [ModelNames.GPT51]: { endPointId: 'gpt-5.1-2025-11-13', description: 'Multimodal' },
};

export const GoogleModel = {
  [ModelNames.Gemini25Flash]: { endPointId: 'gemini-2.5-flash', description: 'Multimodal' },
  [ModelNames.Gemini25Pro]: { endPointId: 'gemini-2.5-pro', description: 'Multimodal' },
};

export const ModelMap = {
  [Provider.Byteplus]: ArkModel,
  [Provider.OpenAI]: OpenAiModel,
  [Provider.Google]: GoogleModel,
  [Provider.CustomLLM]: {
    [ModelNames.Custom]: { endPointId: '', description: 'OpenAI-compatible endpoint' },
  },
};

export const isVisionMode = (model: string) =>
  model !== ModelNames.Custom && Object.values(ModelNames).includes(model as ModelNames);

export const isDeepThinkingMode = (model: string) => Object.hasOwn(ArkModel, model);

/**
 * @brief Flexible Mode (VoiceChat Mode) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316243
 *       Some sensitive fields not provided in frontend were injected by the server (See: Server/sensitive.js).
 *       Web Search / MCP are handled by {@link WebSearchManager} and {@link McpManager} on {@link VoiceChatManager}.
 */
export class LLMManager {
  provider: Provider.Byteplus | Provider.OpenAI | Provider.Google | Provider.CustomLLM;

  url = process.env.REACT_APP_CUSTOM_LLM_URL || '';

  systemMessages: string[] = [];

  endPointId: string = ArkModel[ModelNames.Seed21Turbo].endPointId;

  #paramsMap: Record<
    Provider.Byteplus | Provider.OpenAI | Provider.Google | Provider.CustomLLM,
    {
      Provider?: 'BytePlus' | 'OpenAI';
      Mode?: 'CustomLLM';
      EndPointId?: string;
      Url?: string;
      APIKey?: string;
      SystemMessages?: string[];
      ModelName?: string;
    }
  >;

  constructor() {
    this.provider = Provider.Byteplus;
    this.#paramsMap = {
      [Provider.Byteplus]: {
        Provider: 'BytePlus',
        EndPointId: ArkModel[ModelNames.Seed21Turbo].endPointId,
      },
      [Provider.Google]: {
        Url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        Mode: 'CustomLLM',
      },
      [Provider.CustomLLM]: { Url: this.url, Mode: 'CustomLLM' },
      [Provider.OpenAI]: {
        Url: 'https://api.openai.com/v1/chat/completions',
        Provider: 'OpenAI',
        ModelName: OpenAiModel['GPT-4o'].endPointId,
        SystemMessages: [],
      },
    };
  }

  get value() {
    if (this.provider === Provider.CustomLLM) this.#paramsMap[this.provider].Url = this.url;
    switch (this.provider) {
      case Provider.CustomLLM:
      case Provider.Google:
      case Provider.OpenAI:
        this.#paramsMap[this.provider].SystemMessages = this.systemMessages;
        this.#paramsMap[this.provider].ModelName = this.endPointId;
        break;
      case Provider.Byteplus:
        this.#paramsMap[this.provider].SystemMessages = this.systemMessages;
        this.#paramsMap[this.provider].EndPointId = this.endPointId;
        break;
      default:
        break;
    }
    return this.#paramsMap[this.provider] || {};
  }
}
