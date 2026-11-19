import { Popover } from '@arco-design/web-react';
import { IconDown } from '@arco-design/web-react/icon';
import { useState } from 'react';
import { CALL_TYPE } from '@/app/base';
import { ModeOptions, PopoverContent } from '@/config';
import cascading from '@/assets/img/CascadingSolution.svg';
import endToEnd from '@/assets/img/EndToEnd.svg';
import styles from './index.module.less';

const icons = { [CALL_TYPE.VOICE_CHAT]: cascading, [CALL_TYPE.REAL_TIME]: endToEnd };

export default function SolutionRadio({ value, disabled, onChange }: {
  value: CALL_TYPE;
  disabled: boolean;
  onChange: (mode: CALL_TYPE) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Popover
      position="bottom"
      trigger="click"
      popupVisible={visible && !disabled}
      onVisibleChange={setVisible}
      content={
        <div className={styles.container}>
          {[CALL_TYPE.VOICE_CHAT, CALL_TYPE.REAL_TIME].map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={mode === value}
              className={`${styles.option} ${mode === value ? styles.checked : ''}`}
              onClick={() => {
                setVisible(false);
                if (!disabled && mode !== value) onChange(mode);
              }}
            >
              <img className={styles.icon} src={icons[mode]} alt="" />
              <span className={styles.text}>
                <span className={styles.title}>{ModeOptions[mode]}</span>
                <span className={styles.desc}>{PopoverContent[mode]}</span>
              </span>
            </button>
          ))}
        </div>
      }
    >
      <button type="button" disabled={disabled} aria-expanded={visible && !disabled} className={styles.trigger}>
        <img src={icons[value]} alt="" />{ModeOptions[value]}<IconDown fontSize={8} />
      </button>
    </Popover>
  );
}
