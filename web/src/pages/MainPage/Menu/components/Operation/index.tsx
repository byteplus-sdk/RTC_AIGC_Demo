/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import DeviceDrawerButton from '../DeviceDrawerButton';
import styles from './index.module.less';

function Operation() {
  return (
    <div className={`${styles.box} ${styles.device}`}>
      <DeviceDrawerButton />
    </div>
  );
}

export default Operation;
