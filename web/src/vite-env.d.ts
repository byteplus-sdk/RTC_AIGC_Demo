/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

/// <reference types="vite/client" />

declare module '*.less' {
  const content: { [className: string]: string };
  export default content;
}
