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
  disabled?: boolean;
  label?: string;
}

function InvokeButton(props: IInvokeButtonProps) {
  const { loading, disabled, label, className, onClick, ...rest } = props;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-busy={loading}
      className={`${style.wrapper} ${loading || disabled ? '' : style.cursor} ${className}`}
      {...rest}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
    >
      <div className={style.btn}>
        <img src={CallButtonSVG} alt="call" />
        {loading ? (
          <Loading className={style.icon} />
        ) : (
          <img src={PhoneSVG} className={style.icon} alt="phone" />
        )}
      </div>
      <div className={style.text}>{label || (loading ? 'Connecting' : 'Call now')}</div>
    </div>
  );
}

export default InvokeButton;
