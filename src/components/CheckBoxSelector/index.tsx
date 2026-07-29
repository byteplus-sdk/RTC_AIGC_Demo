/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import React, { useEffect, useMemo, useState, memo, useCallback } from 'react';
import { Button, Drawer, Radio } from '@arco-design/web-react';
import CheckBox from '@/components/CheckBox';
import utils from '@/utils/utils';
import { BYTEPLUS_ASR_LABEL, BYTEPLUS_TTS_LABEL } from '@/config/voiceChat/seedVersion';
import styles from './index.module.less';

const TAB_LABEL: Record<string, string> = {
  ...BYTEPLUS_ASR_LABEL,
  ...BYTEPLUS_TTS_LABEL,
};

const RadioGroup = Radio.Group;

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
  /**
   * The Card been checked.
   */
  checked?: string;
  /**
   * The ratio been selected.
   */
  value?: string;
  /**
   * All the options.
   * - If the data is an array, it will be rendered as a card group.
   * - If the data is an object, it will be rendered as a radio group with cards.
   */
  data?: IData;
  onChecked?: (key: string) => void;
  onChange?: (key: string) => void;
  label?: string;
  placeHolder?: string;
  moreProps?: {
    icon?: string | React.ReactElement;
    text?: string | React.ReactElement;
  };
  auditionProps?: {
    icon?: string | React.ReactElement;
    text?: string | React.ReactElement;
    onAudition?: (item: ICheckBoxItemProps) => void;
  };
}

function CheckBoxSelector(props: IProps) {
  const {
    placeHolder,
    label = '',
    data = [],
    value,
    checked,
    onChange,
    onChecked,
    moreProps,
    auditionProps,
  } = props;
  const isRatioMode = !Array.isArray(data);

  const { icon: moreIcon, text: moreText } = moreProps || {};
  const { icon: auditionIcon, text: auditionText, onAudition } = auditionProps || {};
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string>(value!);
  const [selectedRatio, setSelectedRatio] = useState<string>(checked!);

  /**
   * The selected card one currently.
   */
  const selectedOne = useMemo(() => {
    return (isRatioMode ? data?.[selectedRatio] : data)?.find((item) => item.value === selected);
  }, [data, selected, selectedRatio]);

  const handleSeeMore = () => {
    setVisible(true);
  };

  const wrapper = useCallback(
    (optionRender: (options: ICheckBoxItemProps[]) => React.ReactElement): React.ReactElement => {
      return isRatioMode ? (
        <div className={styles['ratio-wrapper']}>
          <RadioGroup
            options={Object.keys(data).map((key) => ({
              label: TAB_LABEL[key] || utils.capitalizeFirstLetter(key),
              value: key,
            }))}
            type="button"
            onChange={(ratio) => {
              const defaultRadio = data[ratio]?.[0];
              setSelectedRatio(ratio);
              defaultRadio && setSelected(defaultRadio.value);
            }}
            value={selectedRatio}
            style={{ marginBottom: 20 }}
          />
          {optionRender(data[selectedRatio || ''] || [])}
        </div>
      ) : (
        optionRender(data)
      );
    },
    [selectedRatio, selectedOne, data]
  );

  useEffect(() => {
    setSelectedRatio(checked!);
    setSelected(value!);
  }, [visible, value]);

  return (
    <>
      <div className={styles.wrapper}>
        {selectedOne ? (
          <CheckBox
            className={styles.box}
            icon={selectedOne?.icon}
            label={selectedOne?.label || ''}
            description={selectedOne?.description}
            noStyle
          />
        ) : (
          <div className={styles.placeholder}>{placeHolder}</div>
        )}
        {auditionProps ? (
          <Button
            type="text"
            className={`${styles.op} ${styles.audition}`}
            onClick={() => onAudition?.(selectedOne!)}
          >
            {auditionIcon || ''}
            <span className={styles.opText}>{auditionText || 'Audition'}</span>
          </Button>
        ) : null}
        {moreProps ? (
          <Button type="text" className={styles.op} onClick={handleSeeMore}>
            {moreIcon || ''}
            <span className={styles.opText}>{moreText || 'Switch'}</span>
          </Button>
        ) : null}
      </div>
      <Drawer
        style={{
          width: utils.isMobile() ? '100%' : '630px',
        }}
        closable={false}
        maskClosable={false}
        escToExit={false}
        className={styles.modal}
        title={label}
        visible={visible}
        footer={
          <div className={styles.footer}>
            <Button className={styles.cancel} onClick={() => setVisible(false)}>
              Cancel
            </Button>
            <Button
              className={styles.confirm}
              onClick={() => {
                onChange?.(selected);
                onChecked?.(selectedRatio);
                setVisible(false);
              }}
            >
              Confirm
            </Button>
          </div>
        }
      >
        {wrapper((ratios) => (
          <div className={styles.modalInner}>
            {ratios.map((item) => (
              <CheckBox
                key={item.key}
                icon={item.icon}
                label={item.label}
                description={item.description}
                checked={utils.isEqualIgnoreCase(item.value, selected)}
                onClick={() => setSelected(item.value)}
              />
            ))}
          </div>
        ))}
      </Drawer>
    </>
  );
}

export default memo(CheckBoxSelector);
