/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Tag, Spin } from '@arco-design/web-react';
import { RootState } from '@/store';
import Loading from '@/components/Loading/HorizonLoading';
import Config from '@/config';
import { Provider } from '@/config/basic';
import { isRealTimeCallMode } from '@/app/base';
import AIAvatarReadying from '@/components/AIAvatarLoading';
import USER_AVATAR from '@/assets/img/UserAvatar.png';
import CUSTOM_AVATAR from '@/assets/img/CustomAvatar.svg';
import styles from './index.module.less';

const lines: (string | React.ReactNode)[] = [];

function Conversation(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  const room = useSelector((state: RootState) => state.room);
  const msgHistory = room.msgHistory;
  const { userId } = room.localUser;
  const remoteUsers = room.remoteUsers;
  const { isAITalking, isUserTalking } = useSelector((state: RootState) => state.room);
  const isAIReady = remoteUsers.find(
    (user) => user.userId === Config.BotName || user.userId?.startsWith('voiceChat')
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMsg = msgHistory?.[msgHistory.length - 1];
  // Only realtime & byteplus tts are supported.
  const isSupportedSubtitle =
    isRealTimeCallMode() || (!isRealTimeCallMode() && Config['Provider.TTS'] === Provider.Byteplus);
  const isAvatarScene = Config.AvatarEnable;

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight - container.clientHeight;
    }
  }, [msgHistory.length, lastMsg?.value?.length]);

  return (
    <div
      ref={containerRef}
      className={`${styles.conversation} ${className} ${isAvatarScene ? styles.fullScreen : ''}`}
      style={isAvatarScene && !isAIReady ? { justifyContent: 'center' } : {}}
      {...rest}
    >
      {lines.map((line) => line)}
      {!isAIReady ? (
        <div className={styles.aiReadying}>
          {isAvatarScene ? (
            <AIAvatarReadying />
          ) : (
            <>
              <Spin size={16} className={styles['aiReading-spin']} />
              AI preparing...
            </>
          )}
        </div>
      ) : (
        ''
      )}
      {isSupportedSubtitle &&
        msgHistory?.map(({ value, user, isInterrupted }, index) => {
          const isUserMsg = user === userId;
          const isRobotMsg = user === Config.BotName || user.includes('voiceChat_');
          if (!isUserMsg && !isRobotMsg) {
            return '';
          }
          return (
            <div key={`msg-container-${index}`} className={styles.mobileLine}>
              <div className={styles.msgName}>
                <div className={styles.avatar}>
                  <img src={isUserMsg ? USER_AVATAR : CUSTOM_AVATAR} alt="Avatar" />
                </div>
                {isUserMsg ? 'ME' : 'AI'}
              </div>
              <div
                className={`${styles.sentence} ${isUserMsg ? styles.user : styles.robot}`}
                key={`msg-${index}`}
              >
                <div className={styles.content}>
                  {value}
                  <div className={styles['loading-wrapper']}>
                    {/* Realtime non-streaming mode */}
                    {!isRealTimeCallMode() &&
                    isAIReady &&
                    (isUserTalking || isAITalking) &&
                    index === msgHistory.length - 1 ? (
                      <Loading gap={3} className={styles.loading} dotClassName={styles.dot} />
                    ) : (
                      ''
                    )}
                  </div>
                </div>
                {!isUserMsg && isInterrupted ? (
                  <Tag className={styles.interruptTag}>Interrupted</Tag>
                ) : (
                  ''
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default Conversation;
