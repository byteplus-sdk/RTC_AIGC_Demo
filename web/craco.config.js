/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const CracoLessPlugin = require('craco-less');
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  devServer: {
    proxy: {
      '/runtimeConfig': `http://localhost:${process.env.SERVER_PORT || 3001}`,
      '/proxyAIGCFetch': `http://localhost:${process.env.SERVER_PORT || 3001}`,
      '/generateRtcAccessToken': `http://localhost:${process.env.SERVER_PORT || 3001}`,
    },
  },
  jest: {
    configure: { moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' } },
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
};
