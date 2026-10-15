/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider } from '@arco-design/web-react';
import enUS from '@arco-design/web-react/es/locale/en-US';
import App from './App';
import store from './store';
import './index.less';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <Provider store={store}>
    <ConfigProvider locale={enUS}>
      <App />
    </ConfigProvider>
  </Provider>
);
