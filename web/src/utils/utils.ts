/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { v4 as uuidv4 } from 'uuid';
import { Msg, RoomState } from '@/store/slices/room';
import RtcClient from '@/lib/RtcClient';

interface UserBaseInfo {
  deviceId?: string;
  login_token?: string;
}

class Utils {
  userBaseInfo: UserBaseInfo;

  constructor() {
    const userBaseInfo: UserBaseInfo = JSON.parse(localStorage.getItem('userBaseInfo') || '{}');
    this.userBaseInfo = userBaseInfo;
    this.init();
  }

  private init() {
    if (!this.userBaseInfo.deviceId) {
      const deviceId = uuidv4();
      this.userBaseInfo.deviceId = deviceId;
      localStorage.setItem('userBaseInfo', JSON.stringify(this.userBaseInfo));
    }
  }

  getDeviceId = (): string => this.userBaseInfo.deviceId!;

  setLoginToken = (token: string): void => {
    this.userBaseInfo.login_token = token;
  };

  formatTime = (time: number): string => {
    if (time < 0) {
      return '00:00';
    }
    let minutes: number | string = Math.floor(time / 60);
    let seconds: number | string = time % 60;
    minutes = minutes > 9 ? `${minutes}` : `0${minutes}`;
    seconds = seconds > 9 ? `${seconds}` : `0${seconds}`;

    return `${minutes}:${seconds}`;
  };

  formatDate = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };

  setSessionInfo = (params: { [key: string]: any }) => {
    Object.keys(params).forEach((key) => {
      sessionStorage.setItem(key, params[key]);
    });
  };

  getUrlArgs = () => {
    const args = {} as { [key: string]: string };
    const query = window.location.search.substring(1);
    const pairs = query.split('&');
    for (let i = 0; i < pairs.length; i++) {
      const pos = pairs[i].indexOf('=');
      if (pos === -1) continue;
      const name = pairs[i].substring(0, pos);
      let value = pairs[i].substring(pos + 1);
      value = decodeURIComponent(value);
      args[name] = value;
    }
    return args;
  };

  isPureObject = (target: any) => Object.prototype.toString.call(target).includes('Object');

  isArray = Array.isArray;

  addMsgWithoutDuplicate = (arr: RoomState['msgHistory'], added: Msg) => {
    if (arr.length) {
      const last = arr.at(-1)!;
      const { user, value, isInterrupted } = last;
      if (
        (added.user === RtcClient.basicInfo.user_id && last.user === added.user) ||
        (user === added.user && added.value.startsWith(value) && value.trim())
      ) {
        arr.pop();
        added.isInterrupted = isInterrupted;
      }
    }
    arr.push(added);
  };

  stringToTLV(str: string) {
    const type = 'func';
    const typeBuffer = new Uint8Array(4);

    for (let i = 0; i < type.length; i++) {
      typeBuffer[i] = type.charCodeAt(i);
    }

    const lengthBuffer = new Uint32Array(1);
    const valueBuffer = new TextEncoder().encode(str);

    lengthBuffer[0] = valueBuffer.length;

    const tlvBuffer = new Uint8Array(typeBuffer.length + 4 + valueBuffer.length);

    tlvBuffer.set(typeBuffer, 0);

    tlvBuffer[4] = (lengthBuffer[0] >> 24) & 0xff;
    tlvBuffer[5] = (lengthBuffer[0] >> 16) & 0xff;
    tlvBuffer[6] = (lengthBuffer[0] >> 8) & 0xff;
    tlvBuffer[7] = lengthBuffer[0] & 0xff;

    tlvBuffer.set(valueBuffer, 8);
    return tlvBuffer.buffer;
  }

  string2tlv(str: string, type = '') {
    const typeBuffer = new Uint8Array(4);

    for (let i = 0; i < type.length; i++) {
      typeBuffer[i] = type.charCodeAt(i);
    }

    const lengthBuffer = new Uint32Array(1);
    const valueBuffer = new TextEncoder().encode(str);

    lengthBuffer[0] = valueBuffer.length;

    const tlvBuffer = new Uint8Array(typeBuffer.length + 4 + valueBuffer.length);

    tlvBuffer.set(typeBuffer, 0);

    tlvBuffer[4] = (lengthBuffer[0] >> 24) & 0xff;
    tlvBuffer[5] = (lengthBuffer[0] >> 16) & 0xff;
    tlvBuffer[6] = (lengthBuffer[0] >> 8) & 0xff;
    tlvBuffer[7] = lengthBuffer[0] & 0xff;

    tlvBuffer.set(valueBuffer, 8);
    return tlvBuffer.buffer;
  }

  tlv2String(tlvBuffer: ArrayBufferLike) {
    const typeBuffer = new Uint8Array(tlvBuffer, 0, 4);
    const lengthBuffer = new Uint8Array(tlvBuffer, 4, 4);
    const valueBuffer = new Uint8Array(tlvBuffer, 8);

    let type = '';
    for (let i = 0; i < typeBuffer.length; i++) {
      type += String.fromCharCode(typeBuffer[i]);
    }

    const length =
      (lengthBuffer[0] << 24) | (lengthBuffer[1] << 16) | (lengthBuffer[2] << 8) | lengthBuffer[3];

    const value = new TextDecoder().decode(valueBuffer.subarray(0, length));

    return { type, value };
  }

  isMobile() {
    return /Mobi|Android/i.test(window.navigator.userAgent);
  }

  isEqualIgnoreCase(str1: string, str2: string) {
    return str1?.toLowerCase() === str2?.toLowerCase();
  }

  capitalizeFirstLetter = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  getKeyByValue(obj: any, value: string) {
    if (!obj) {
      return;
    }
    for (const key in obj) {
      if (obj?.[key] === value) {
        return key;
      }
    }
  }
}

export default new Utils();
