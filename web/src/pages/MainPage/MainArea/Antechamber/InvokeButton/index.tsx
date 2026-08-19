/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import Loading from './loading';
import style from './index.module.less';
import CallButtonSVG from '@/assets/img/CallWrapper.svg';
import PhoneSVG from '@/assets/img/Phone.svg';

interface IInvokeButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  loading?: boolean;
}

function InvokeButton(props: IInvokeButtonProps) {
  const { loading, className, ...rest } = props;

  return (
    <div className={`${style.wrapper} ${loading ? '' : style.cursor} ${className}`} {...rest}>
      <div className={style.btn}>
        <img src={CallButtonSVG} alt="call" />
        {loading ? (
          <Loading className={style.icon} />
        ) : (
          <img src={PhoneSVG} className={style.icon} alt="phone" />
        )}
      </div>
      <div className={style.text}>{loading ? 'Connecting' : 'Call now'}</div>
    </div>
  );
}

export default InvokeButton;
