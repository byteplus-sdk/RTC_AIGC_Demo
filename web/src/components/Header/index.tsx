/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Divider } from '@arco-design/web-react';
import NetworkIndicator from '@/components/NetworkIndicator';
import utils from '@/utils/utils';
import styles from './index.module.less';
import Logo from '@/assets/img/Logo.svg';

interface HeaderProps {
  children?: React.ReactNode;
  hide?: boolean;
}

function Header(props: HeaderProps) {
  const { children, hide } = props;

  return (
    <div
      className={styles.header}
      style={{
        display: hide ? 'none' : 'flex',
      }}
    >
      <div className={styles['header-logo']}>
        <img src={Logo} alt="Logo" />
        <Divider type="vertical" />
        <span className={styles['header-logo-text']}>
          {utils.isMobile() ? 'Demo Experience Hall' : 'RTC Demo Experience Hall'}
        </span>
        <NetworkIndicator />
      </div>
      {children}
    </div>
  );
}

export default Header;
