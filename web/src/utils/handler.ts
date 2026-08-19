/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useDispatch } from 'react-redux';
import logger from './logger';
import {
  setHistoryMsg,
  // setInterruptMsg,
  updateAITalkState,
  // updateAIThinkState,
} from '@/store/slices/room';
import RtcClient from '@/lib/RtcClient';
import Utils from '@/utils/utils';
import config from '@/config';

export type AnyRecord = Record<string, any>;

export enum MESSAGE_TYPE {
  BRIEF = 'conv',
  SUBTITLE = 'subv',
  FUNCTION_CALL = 'tool',
}

export enum AGENT_BRIEF {
  UNKNOWN,
  LISTENING,
  THINKING,
  SPEAKING,
  INTERRUPTED,
  FINISHED,
}

/**
 * @brief Command types
 */
export enum COMMAND {
  /**
   * @brief Interrupt command
   */
  INTERRUPT = 'interrupt',
  /**
   * @brief Send external text to drive TTS
   */
  EXTERNAL_TEXT_TO_SPEECH = 'ExternalTextToSpeech',
  /**
   * @brief Send external text to drive LLM
   */
  EXTERNAL_TEXT_TO_LLM = 'ExternalTextToLLM',
}

/**
 * @brief Interrupt priority types
 * refer https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1404671
 */
export enum INTERRUPT_PRIORITY {
  /**
   * @brief Placeholder
   */
  NONE,
  /**
   * @brief High priority. The incoming information directly interrupts the interaction and is processed.
   */
  HIGH,
  /**
   * @brief Medium priority. Wait until the current interaction ends and then process.
   */
  MEDIUM,
  /**
   * @brief Low priority. If an interaction is currently occurring, directly discard the information passed in by Message.
   */
  LOW,
}

export const MessageTypeCode = {
  [MESSAGE_TYPE.SUBTITLE]: 1,
  [MESSAGE_TYPE.FUNCTION_CALL]: 2,
  [MESSAGE_TYPE.BRIEF]: 3,
};

export const useMessageHandler = () => {
  const dispatch = useDispatch();

  const maps = {
    [MESSAGE_TYPE.BRIEF]: (parsed: AnyRecord) => {
      const { Stage } = parsed || {};
      const { Code, Description } = Stage || {};
      logger.debug(Code, Description);
      switch (Code) {
        case AGENT_BRIEF.THINKING:
          // dispatch(updateAIThinkState({ isAIThinking: true }));
          break;
        case AGENT_BRIEF.SPEAKING:
          dispatch(updateAITalkState({ isAITalking: true }));
          break;
        case AGENT_BRIEF.FINISHED:
          dispatch(updateAITalkState({ isAITalking: false }));
          break;
        case AGENT_BRIEF.INTERRUPTED:
          // dispatch(setInterruptMsg());
          break;
        default:
          break;
      }
    },
    [MESSAGE_TYPE.SUBTITLE]: (parsed: AnyRecord) => {
      const data = parsed.data?.[0] || {};
      /** debounce */
      if (data) {
        const { text: msg, definite, userId: user, paragraph } = data;
        logger.debug(data);
        if ((window as any)._debug_mode) {
          dispatch(setHistoryMsg({ msg, user, paragraph, definite }));
        } else {
          const isAudioEnable = RtcClient.getAudioBotEnabled();
          if (isAudioEnable) {
            dispatch(setHistoryMsg({ text: msg, user, paragraph, definite }));
          }
        }
      }
    },
    [MESSAGE_TYPE.FUNCTION_CALL]: (parsed: AnyRecord) => {
      const name: string = parsed?.tool_calls?.[0]?.function?.name;
      console.log('[Function Call] - Called by sendUserBinaryMessage');
      const map: Record<string, string> = {
        getcurrentweather: "It's snowing today, minimum temperature is -10 degrees",
        musicplayer: 'Found Li Si\'s song, title is "Thousands of Miles Away"',
        sendmessage: 'Sent successfully',
      };

      RtcClient.engine.sendUserBinaryMessage(
        config.BotName,
        Utils.string2tlv(
          JSON.stringify({
            ToolCallID: parsed?.tool_calls?.[0]?.id,
            Content: map[name.toLocaleLowerCase().replaceAll('_', '')],
          }),
          'func'
        )
      );
    },
  };

  return {
    parser: (buffer: ArrayBuffer) => {
      try {
        const { type, value } = Utils.tlv2String(buffer);
        maps[type as MESSAGE_TYPE]?.(JSON.parse(value));
      } catch (e) {
        logger.debug('parse error', e);
      }
    },
  };
};
