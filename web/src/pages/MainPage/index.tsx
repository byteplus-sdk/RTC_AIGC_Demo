/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useState } from 'react';
import { Button, Drawer } from '@arco-design/web-react';
import { IconSettings } from '@arco-design/web-react/icon';
import Header from '@/components/Header';
import ResizeWrapper from '@/components/ResizeWrapper';
import Menu from './Menu';
import utils from '@/utils/utils';
import MainArea from './MainArea';
import styles from './index.module.less';

export default function () {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <ResizeWrapper className={styles.container}>
      <Header>
        {utils.isMobile() && (
          <Button
            type="text"
            aria-label="Open settings"
            icon={<IconSettings />}
            onClick={() => setSettingsOpen(true)}
          />
        )}
      </Header>
      {utils.isMobile() && (
        <Drawer
          title="Settings"
          width="100%"
          footer={null}
          visible={settingsOpen}
          onCancel={() => setSettingsOpen(false)}
        >
          <Menu />
        </Drawer>
      )}
      <div className={styles.main}>
        <div className={`${styles.mainArea} ${utils.isMobile() ? styles.isMobile : ''}`}>
          <MainArea />
        </div>
        {utils.isMobile() ? null : (
          <div className={styles.operationArea}>
            <Menu />
          </div>
        )}
      </div>
    </ResizeWrapper>
  );
}
