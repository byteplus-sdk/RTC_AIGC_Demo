/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider } from '../basic';
import ArkSVG from '@/assets/img/Ark.svg';
import DeepSeekSVG from '@/assets/img/DeepSeek.svg';

/**
 * @note Ark Model IDs, visit following url to find endpoint column, set model ID you want to use.
 *       *Demo default use 'Skylark-pro', you could modify it in LLMManager.endPointId.*
 * @refer https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint
 */
export const ArkModel = {
  'Skylark-pro': {
    endPointId: 'Your model ID',
    description: '128k, Trial supported',
    icon: ArkSVG,
  },
  'Skylark-lite': {
    endPointId: 'Your model ID',
    description: '32k, Trial supported',
    icon: ArkSVG,
  },
  'DeepSeek-R1｜250528': {
    endPointId: 'Your model ID',
    description: '32k, Trial supported',
    icon: DeepSeekSVG,
  },
  'DeepSeek-R1｜250120': {
    endPointId: 'Your model ID',
    description: '32k, Trial supported',
    icon: DeepSeekSVG,
  },
  'DeepSeek-V3｜250324': {
    endPointId: 'Your model ID',
    description: '128k, Trial supported',
    icon: DeepSeekSVG,
  },
  'Deepseek-R1-Distill-Qwen-32b｜250120': {
    endPointId: 'Your model ID',
    description: '32k, Trial supported',
    icon: DeepSeekSVG,
  },
};

export const OpenAiModel = {
  'GPT-4o': {
    endPointId: 'gpt-4o-2024-11-20',
    description: 'GPT-4o 2024-11-20',
  },
};

export const ModelMap = {
  [Provider.Byteplus]: ArkModel,
  [Provider.OpenAI]: OpenAiModel,
};

/**
 * @brief Flexible Mode (VoiceChat Mode) Config.
 * @note For more information, you can refer to https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1316243
 *       Some sensitive fields not provided in frontend were injected by the server (See: Server/sensitive.js).
 */
export class LLMManager {
  provider: Provider.Byteplus | Provider.OpenAI;

  systemMessages: string[] = [];

  endPointId: string = ArkModel['Skylark-pro'].endPointId;

  #paramsMap: {
    [Provider.Byteplus]: {
      Mode: 'BytePlusArk';
      /**
       * @refer https://console.byteplus.com/voice/service/1000014?s=g
       */
      EndPointId: string;
      /**
       * @note Injected by server, refer to Server/sensitive.js.
       * @refer https://console.byteplus.com/ark/region:ark+ap-southeast-1/endpoint?s=g
       */
      APIKey?: string;
      SystemMessages?: string[];
    };
    /**
     * @note Demo using OpenAI as example for CustomLLM.
     */
    [Provider.OpenAI]: {
      Mode: 'CustomLLM';
      /**
       * @note Third part request url, like `https://api.openai.com/v1/chat/completions` for example.
       *       - Protocol: Must support the SSE (Server-Sent Events) protocol.
       *       - Headers: Content-Type must be text/event-stream.
       *       - Terminator: Must contain the data: [DONE] terminator.
       *
       *       If need using third part API, you can contact BytePlus support team for more technical support.
       */
      Url: string;
      /**
       * @refer https://platform.openai.com/docs/models#tts
       */
      ModelName?: string;
      /**
       * @note Injected by server, refer to Server/sensitive.js.
       * @refer https://platform.openai.com/api-keys
       */
      APIKey?: string;
      SystemMessages?: string[];
      UserMessages?: string[];
    };
  };

  constructor() {
    this.provider = Provider.Byteplus;
    this.#paramsMap = {
      [Provider.Byteplus]: {
        Mode: 'BytePlusArk',
        EndPointId: ArkModel['Skylark-pro'].endPointId,
      },
      [Provider.OpenAI]: {
        Url: 'https://api.openai.com/v1/chat/completions',
        Mode: 'CustomLLM',
        ModelName: OpenAiModel['GPT-4o'].endPointId,
        SystemMessages: [],
        UserMessages: [],
      },
    };
  }

  get value() {
    switch (this.provider) {
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
