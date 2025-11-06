/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { createSlice } from '@reduxjs/toolkit';
import {
  AudioPropertiesInfo,
  LocalAudioStats,
  NetworkQuality,
  RemoteAudioStats,
} from '@byteplus/rtc';
import { CALL_TYPE } from '@/app/base';
import { ConfigFactory } from '@/config/config';
import config from '@/config';

export interface IUser {
  username?: string;
  userId?: string;
  publishAudio?: boolean;
  publishVideo?: boolean;
  publishScreen?: boolean;
  audioStats?: RemoteAudioStats;
  audioPropertiesInfo?: AudioPropertiesInfo;
}

export type LocalUser = Omit<IUser, 'audioStats'> & {
  loginToken?: string;
  audioStats?: LocalAudioStats;
};

export interface Msg {
  value: string;
  time: string;
  user: string;
  paragraph?: boolean;
  definite?: boolean;
  isInterrupted?: boolean;
}

export interface RoomState {
  time: number;
  roomId?: string;
  localUser: LocalUser;
  remoteUsers: IUser[];
  autoPlayFailUser: string[];
  /**
   * @brief Whether the user has joined the room.
   */
  isJoined: boolean;
  /**
   * @brief The selected mode.
   */
  callMode: CALL_TYPE;

  /**
   * @brief Whether AI call is enabled.
   */
  isAIGCEnable: boolean;
  /**
   * @brief Whether the AI is talking.
   */
  isAITalking: boolean;
  /**
   * @brief Whether the user is talking.
   */
  isUserTalking: boolean;
  /**
   * @brief Whether the room is in full screen mode.
   */
  isFullScreen: boolean;
  /**
   * @brief Basic AI configuration.
   */
  aiConfig: ConfigFactory;
  /**
   * @brief Network quality.
   */
  networkQuality: NetworkQuality;

  /**
   * @brief Conversation history.
   */
  msgHistory: Msg[];

  /**
   * @brief Current conversation.
   */
  currentConversation: {
    [user: string]: {
      /**
       * @brief Real-time conversation content.
       */
      msg: string;
      /**
       * @brief Whether the current real-time conversation content has semantics.
       */
      definite: boolean;
    };
  };
}

const initialState: RoomState = {
  time: -1,
  callMode: CALL_TYPE.VOICE_CHAT,
  remoteUsers: [],
  localUser: {
    publishAudio: true,
    publishVideo: true,
  },
  autoPlayFailUser: [],
  isJoined: false,
  isAIGCEnable: false,
  isAITalking: false,
  isUserTalking: false,
  isFullScreen: false,
  networkQuality: NetworkQuality.UNKNOWN,

  aiConfig: config,

  msgHistory: [],
  currentConversation: {},
};

export const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    localJoinRoom: (
      state,
      {
        payload,
      }: {
        payload: {
          roomId: string;
          user: LocalUser;
        };
      }
    ) => {
      state.roomId = payload.roomId;
      state.localUser = {
        ...state.localUser,
        ...payload.user,
      };
      state.isJoined = true;
    },
    localLeaveRoom: (state) => {
      state.roomId = undefined;
      state.time = -1;
      state.localUser = {
        publishAudio: true,
        publishVideo: true,
      };
      state.remoteUsers = [];
      state.isJoined = false;
    },
    remoteUserJoin: (state, { payload }) => {
      state.remoteUsers.push(payload);
    },
    remoteUserLeave: (state, { payload }) => {
      const findIndex = state.remoteUsers.findIndex((user) => user.userId === payload.userId);
      state.remoteUsers.splice(findIndex, 1);
    },

    updateCallMode: (state, { payload }) => {
      state.callMode = payload.callMode;
    },

    updateLocalUser: (state, { payload }: { payload: Partial<LocalUser> }) => {
      state.localUser = {
        ...state.localUser,
        ...payload,
      };
    },

    updateNetworkQuality: (state, { payload }) => {
      state.networkQuality = payload.networkQuality;
    },

    updateRemoteUser: (state, { payload }: { payload: IUser | IUser[] }) => {
      if (!Array.isArray(payload)) {
        payload = [payload];
      }

      payload.forEach((user) => {
        const findIndex = state.remoteUsers.findIndex((u) => u.userId === user.userId);
        state.remoteUsers[findIndex] = {
          ...state.remoteUsers[findIndex],
          ...user,
        };
      });
    },

    updateRoomTime: (state, { payload }) => {
      state.time = payload.time;
    },

    addAutoPlayFail: (state, { payload }) => {
      const autoPlayFailUser = state.autoPlayFailUser;
      const index = autoPlayFailUser.findIndex((item) => item === payload.userId);
      if (index === -1) {
        state.autoPlayFailUser.push(payload.userId);
      }
    },
    removeAutoPlayFail: (state, { payload }) => {
      const autoPlayFailUser = state.autoPlayFailUser;
      const _autoPlayFailUser = autoPlayFailUser.filter((item) => item !== payload.userId);
      state.autoPlayFailUser = _autoPlayFailUser;
    },
    clearAutoPlayFail: (state) => {
      state.autoPlayFailUser = [];
    },
    updateAIGCState: (state, { payload }) => {
      state.isAIGCEnable = payload.isAIGCEnable;
    },
    updateAITalkState: (state, { payload }) => {
      state.isAITalking = payload.isAITalking;
    },
    updateFullScreen: (state, { payload }) => {
      state.isFullScreen = payload.isFullScreen;
    },
    updateAIConfig: (state, { payload }) => {
      state.aiConfig = Object.assign(state.aiConfig, payload);
    },
    clearHistoryMsg: (state) => {
      state.msgHistory = [];
    },
    addHistoryMsg: (state, { payload }) => {
      state.msgHistory.push(payload);
    },
    setHistoryMsg: (state, { payload }) => {
      const { paragraph, definite } = payload;
      const lastMsg = state.msgHistory.at(-1)! || {};
      /** Whether need to create a new sentence */
      const fromBot = payload.user === config.BotName || payload.user.includes('voiceChat_');
      /**
       * Bot's sentences:
       *  1. use definite to determine whether to append new content when SubtitleMode = 0 (which is the default value when avatar is disabled)
       *  2. use paragraph to determine whether to append new content when SubtitleMode = 1 (which is the default value when avatar is enabled)
       * User's sentences use paragraph to determine whether to append new content
       */
      const currentSubtitleMode = config.AvatarEnable ? 1 : 0;
      const lastMsgCompleted =
        !fromBot || currentSubtitleMode ? lastMsg.paragraph : lastMsg.definite;

      if (state.msgHistory.length) {
        /** If the last sentence is complete, add a new sentence */
        if (lastMsgCompleted) {
          state.msgHistory.push({
            value: payload.text,
            time: new Date().toString(),
            user: payload.user,
            definite,
            paragraph,
          });
        } else {
          /** Speech not finished, update text content */
          if (fromBot && currentSubtitleMode) {
            lastMsg.value += payload.text;
          } else {
            lastMsg.value = payload.text;
          }
          lastMsg.time = new Date().toString();
          lastMsg.paragraph = paragraph;
          lastMsg.definite = definite;
          lastMsg.user = payload.user;
          fromBot ? (state.isAITalking = !paragraph) : (state.isUserTalking = !paragraph);
        }
      } else {
        /** The first word of the first sentence will not be interrupted */
        state.msgHistory.push({
          value: payload.text,
          time: new Date().toString(),
          user: payload.user,
          paragraph,
        });
      }
    },
    setInterruptMsg: (state) => {
      state.isAITalking = false;
      if (!state.msgHistory.length) {
        return;
      }
      /** Find the last subtitle at the end and change its status to interrupted */
      for (let id = state.msgHistory.length - 1; id >= 0; id--) {
        const msg = state.msgHistory[id];
        if (msg.value && msg.user === config.BotName && !msg.paragraph) {
          state.msgHistory[id].isInterrupted = true;
          break;
        }
      }
    },
  },
});

export const {
  localJoinRoom,
  localLeaveRoom,
  remoteUserJoin,
  remoteUserLeave,
  updateRemoteUser,
  updateLocalUser,
  updateRoomTime,
  addAutoPlayFail,
  removeAutoPlayFail,
  clearAutoPlayFail,
  updateAIGCState,
  updateAITalkState,
  updateFullScreen,
  updateAIConfig,
  updateNetworkQuality,
  updateCallMode,
  clearHistoryMsg,
  addHistoryMsg,
  setHistoryMsg,
  setInterruptMsg,
} = roomSlice.actions;

export default roomSlice.reducer;
