/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import styles from './index.module.less';
import AnchorSVG from '@/assets/img/Anchor.svg';

type IAnchorTitleProps = {
  content?: string;
  onExtraClick?: () => void;
  extra?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

function AnchorTitle(props: IAnchorTitleProps) {
  const { content = '', extra, onExtraClick, ...rest } = props;
  return (
    <div className={styles.wrapper} {...rest}>
      <img src={AnchorSVG} alt="anchor" />
      {content}
      <div onClick={onExtraClick}>{extra}</div>
    </div>
  );
}
export default AnchorTitle;
