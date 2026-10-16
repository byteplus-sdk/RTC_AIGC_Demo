import React, { memo, useState } from 'react';
import { Button, Popover, Radio } from '@arco-design/web-react';
import CheckBox from '@/components/CheckBox';
import utils from '@/utils/utils';
import { BYTEPLUS_ASR_LABEL, BYTEPLUS_TTS_LABEL } from '@/config/voiceChat/seedVersion';
import styles from './index.module.less';

const TAB_LABEL: Record<string, string> = { ...BYTEPLUS_ASR_LABEL, ...BYTEPLUS_TTS_LABEL };

export interface ICheckBoxItemProps {
  icon?: string;
  label: string;
  description?: string;
  key: string;
  ratio?: string;
  value: string;
}

type IData = ICheckBoxItemProps[] | Record<string, ICheckBoxItemProps[]>;
interface IProps {
  checked?: string;
  value?: string;
  data?: IData;
  onChecked?: (key: string) => void;
  onChange?: (key: string) => void;
  label?: string;
  placeHolder?: string;
  moreProps?: { icon?: string | React.ReactElement; text?: string | React.ReactElement };
  auditionProps?: {
    icon?: string | React.ReactElement;
    text?: string | React.ReactElement;
    onAudition?: (item: ICheckBoxItemProps) => void;
  };
}

function CheckBoxSelector({
  data = [],
  checked,
  value,
  onChecked,
  onChange,
  label = '',
  placeHolder,
  moreProps,
  auditionProps,
}: IProps) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(value || '');
  const [group, setGroup] = useState(checked || '');
  const grouped = !Array.isArray(data);
  const currentOptions = grouped ? data[checked || ''] || [] : data;
  const selectedOne = currentOptions.find((item) => item.value === value);
  const options = grouped ? data[group] || [] : data;

  const handleVisibleChange = (next: boolean) => {
    if (next) {
      setGroup(checked || (grouped ? Object.keys(data)[0] : '') || '');
      setSelected(value || '');
    }
    setVisible(next);
  };

  return (
    <div className={styles.wrapper}>
      {selectedOne ? (
        <CheckBox
          className={styles.box}
          icon={selectedOne.icon}
          label={selectedOne.label}
          description={selectedOne.description}
          noStyle
        />
      ) : (
        <div className={styles.placeholder}>{checked === 'none' ? 'None' : placeHolder}</div>
      )}
      {auditionProps && selectedOne && (
        <Button
          type="text"
          className={styles.op}
          onClick={() => auditionProps.onAudition?.(selectedOne)}
        >
          {auditionProps.icon}
          <span>{auditionProps.text || 'Audition'}</span>
        </Button>
      )}
      {moreProps && (
        <Popover
          trigger="click"
          position="bottom"
          style={{
            width: 'min(574px, calc(100vw - 24px))',
            maxWidth: 'calc(100vw - 24px)',
          }}
          popupVisible={visible}
          onVisibleChange={handleVisibleChange}
          content={
            <div className={styles.picker}>
              <div className={styles.title}>{label}</div>
              {grouped && (
                <Radio.Group
                  type="button"
                  value={group}
                  className={styles.tabs}
                  options={Object.keys(data).map((key) => ({
                    value: key,
                    label: TAB_LABEL[key] || utils.capitalizeFirstLetter(key),
                  }))}
                  onChange={(key) => {
                    setGroup(key);
                    setSelected(data[key]?.[0]?.value || '');
                  }}
                />
              )}
              <div className={styles.options}>
                {options.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={styles.option}
                    aria-pressed={selected === item.value}
                    onClick={() => setSelected(item.value)}
                  >
                    <CheckBox
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      checked={selected === item.value}
                    />
                  </button>
                ))}
                {!options.length && <div className={styles.placeholder}>None</div>}
              </div>
              <div className={styles.footer}>
                <Button onClick={() => setVisible(false)}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    onChange?.(selected);
                    if (grouped) onChecked?.(group);
                    setVisible(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          }
        >
          <Button type="text" className={styles.op} aria-label={`Change ${label}`}>
            {moreProps.icon}
            <span>{moreProps.text}</span>
          </Button>
        </Popover>
      )}
    </div>
  );
}
export default memo(CheckBoxSelector);
