/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import VERTC from '@byteplus/rtc';
import { Tag, Tooltip, Typography } from '@arco-design/web-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import Operation from './components/Operation';
import WebSearchToggle from './components/WebSearchToggle';
import McpHomeBlock from './components/McpHomeBlock';
import { Questions } from '@/config';
import RtcClient from '@/lib/RtcClient';
import { COMMAND, INTERRUPT_PRIORITY } from '@/utils/handler';
import { addHistoryMsg, setInterruptMsg } from '@/store/slices/room';
import AISettings from '@/components/AISettings';
import { isRealTimeCallMode } from '@/app/base';
import styles from './index.module.less';

function Menu() {
  const dispatch = useDispatch();
  const room = useSelector((state: RootState) => state.room);
  const isJoined = room?.isJoined;

  const handleQuestion = (question: string) => {
    RtcClient.commandAgent(COMMAND.EXTERNAL_TEXT_TO_LLM, INTERRUPT_PRIORITY.HIGH, question);
    dispatch(setInterruptMsg());
    dispatch(
      addHistoryMsg({
        value: question,
        time: new Date().toString(),
        user: room.localUser.userId,
        paragraph: true,
        definite: true,
        isInterrupted: false,
      })
    );
  };

  const handleOfficialLinkClick = () => {
    window.open('https://console.byteplus.com/home', '_blank');
  };

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.box} ${styles.info}`}>
        <div className={styles.bold}>
          Mode <Tag size="small">{process.env.REACT_APP_MODE?.toUpperCase()}</Tag>
        </div>
        <div className={styles.bold}>Demo Version 1.4.0</div>
        <div className={styles.bold}>SDK Version {VERTC.getSdkVersion()}</div>
        {isJoined ? (
          <div className={styles.gray}>
            <span className={styles.bold}>RoomID </span>
            <Tooltip content={room.roomId || '-'}>
              <Typography.Paragraph
                ellipsis={{
                  rows: 1,
                  expandable: false,
                }}
                className={styles.value}
              >
                {room.roomId || '-'}
              </Typography.Paragraph>
            </Tooltip>
          </div>
        ) : (
          ''
        )}
        <div className={styles.buttonArea}>
          <div className={styles.getMore} onClick={handleOfficialLinkClick}>
            Learn more
          </div>
        </div>
      </div>
      {isJoined && !isRealTimeCallMode() ? (
        <div className={`${styles.box} ${styles.questions}`}>
          <div className={styles.title}>Click on the sample questions below to ask:</div>
          {Questions.map((question) => (
            <div onClick={() => handleQuestion(question)} className={styles.line} key={question}>
              {question}
            </div>
          ))}
        </div>
      ) : (
        ''
      )}
      <AISettings />
      {!isRealTimeCallMode() ? (
        <>
          <WebSearchToggle />
          <McpHomeBlock />
        </>
      ) : null}
      {isJoined ? <Operation /> : null}
    </div>
  );
}

export default Menu;
