/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import styles from './index.module.less';

interface ITitleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  required?: boolean;
}

function TitleCard(props: ITitleCardProps) {
  const { required, title, children, className, ...rest } = props;
  return (
    <div className={`${styles.wrapper} ${className}`} {...rest}>
      <div className={styles.title}>
        {required ? <div className={styles.required}>* </div> : ''}
        {title}
      </div>
      <div className={styles.children}>{children}</div>
    </div>
  );
}
export default TitleCard;
