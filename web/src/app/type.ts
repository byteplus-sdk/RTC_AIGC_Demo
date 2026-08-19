/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

export type RequestParams = Record<string, any>;

export interface RequestResponse {
  ResponseMetadata: Partial<{
    Action: string;
    Version: string;
    Service: string;
    Region: string;
    RequestId: string;
    Error: {
      Code: string;
    };
  }>;
  Result: any;
}

export type ApiConfig = { name: string; method: string };
type TupleToUnion<T extends readonly unknown[]> = T[number];
export type ApiNames<T extends ApiConfig[]> = Pick<TupleToUnion<T>, 'name'>['name'];
type RequestFn = <T extends keyof RequestResponse>(params?: RequestParams[T]) => RequestResponse[T];
type PromiseRequestFn = <T extends keyof RequestResponse>(
  params?: RequestParams[T]
) => Promise<RequestResponse[T]>;
export type Apis<T extends ApiConfig[]> = Record<ApiNames<T>, RequestFn | PromiseRequestFn>;
