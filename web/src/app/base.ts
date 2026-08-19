/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Message } from '@arco-design/web-react';
import { AIGC_PROXY_HOST } from '@/config';
import type { RequestResponse, ApiConfig, ApiNames, Apis } from './type';

type Headers = Record<string, string>;

export enum CALL_TYPE {
  REAL_TIME = 'realtime',
  VOICE_CHAT = 'voicechat',
}

/**
 * @brief Judging the mode.
 */
export const isRealTimeCallMode = () => {
  /** See package.json, demo defined REACT_APP_MODE. */
  return process.env.REACT_APP_MODE === CALL_TYPE.REAL_TIME;
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * @brief Get
 * @param apiName
 * @param headers
 */
export const requestGetMethod = (apiName: string, headers = {}) => {
  return async (params: Record<string, any> = {}) => {
    const url = `${AIGC_PROXY_HOST}?action=${apiName}&${Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join('&')}`;
    const res = await fetch(url, {
      headers: {
        ...headers,
      },
    });
    return res;
  };
};

/**
 * @brief Post
 * @param apiName
 * @param isJson
 * @param headers
 */
export const requestPostMethod = (
  actionName: string,
  apiPath: string,
  isJson: boolean = true,
  headers: Headers = {}
) => {
  return async <T>(params: T) => {
    const res = await fetch(`${AIGC_PROXY_HOST}${apiPath}?action=${actionName}`, {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: (isJson ? JSON.stringify(params) : params) as BodyInit,
    });
    return res;
  };
};

/**
 * @brief Return handler
 * @param res
 */
export const resultHandler = (res: RequestResponse) => {
  const { Result, ResponseMetadata } = res || {};
  if (Result === 'ok' || typeof Result !== 'string') {
    return Result;
  }
  Message.error(`[${ResponseMetadata?.Action}]call failed(reason: ${Result})`);
  throw new Error(
    `[${ResponseMetadata?.Action}]call failed(${JSON.stringify(ResponseMetadata, null, 2)})`
  );
};

/**
 * @brief Generate APIs by apiConfigs
 * @param apiConfigs
 */
export const generateAPIs = (apiConfigs: ApiConfig[]) =>
  apiConfigs.reduce<Apis<ApiConfig[]>>((store, cur) => {
    const {
      name,
      apiPath = '',
      method = 'get',
    } = cur as {
      name: ApiNames<ApiConfig[]>;
      apiPath: string;
      version: string;
      method: string;
    };
    store[name] = async (params) => {
      const queryData =
        method === 'get'
          ? await requestGetMethod(name)(params)
          : await requestPostMethod(name, apiPath)(params);
      const res = await queryData?.json();
      return resultHandler(res);
    };
    return store;
  }, {});
