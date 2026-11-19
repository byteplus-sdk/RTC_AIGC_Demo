/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import React, { useRef, useEffect } from 'react';
import Markdown, { type Components, type ExtraProps } from 'react-markdown';
import { useSelector } from 'react-redux';
import { Tag, Spin } from '@arco-design/web-react';
import { RootState } from '@/store';
import Loading from '@/components/Loading/HorizonLoading';
import Config from '@/config';
import { Provider, usesAiGateway } from '@/config/basic';
import { isRealTimeCallMode } from '@/app/base';
import AIAvatarReadying from '@/components/AIAvatarLoading';
import USER_AVATAR from '@/assets/img/UserAvatar.png';
import { Icon, Name } from '@/config/scene';
import styles from './index.module.less';

const SubtitleSource = React.createContext('');

function SubtitleParagraph({ children, node }: React.PropsWithChildren<ExtraProps>) {
  const source = React.useContext(SubtitleSource);
  return (
    <p>
      {React.Children.map(children, (child, index) => {
        const position = node?.children[index]?.position;
        if (typeof child !== 'string' || !position || !child.includes('##')) return child;
        const literal = source.slice(position.start.offset, position.end.offset);
        if (literal !== child) return child;
        return child.replace(/(^|[^#\\])[ \t]*#{2,6}[ \t]+(?=\S|$)/g, '$1\n');
      })}
    </p>
  );
}

const subtitleComponents: Components = {
  p: SubtitleParagraph,
  a: ({ children, href, title }) => (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ alt }) => alt,
};

const ReplyMarkdown = React.memo(function ReplyMarkdown({ text }: { text: string }) {
  return (
    <SubtitleSource.Provider value={text}>
      <Markdown components={subtitleComponents}>{text}</Markdown>
    </SubtitleSource.Provider>
  );
});

const lines: (string | React.ReactNode)[] = [];

function Conversation(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  const room = useSelector((state: RootState) => state.room);
  const msgHistory = room.msgHistory;
  const { userId } = room.localUser;
  const remoteUsers = room.remoteUsers;
  const { isAITalking, isUserTalking, scene, isShowSubtitle } = useSelector(
    (state: RootState) => state.room
  );
  const isAIReady = remoteUsers.find(
    (user) => user.userId === Config.BotName || user.userId?.startsWith('voiceChat')
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMsg = msgHistory?.[msgHistory.length - 1];
  const isAvatarScene = Config.AvatarEnable;
  const isSupportedSubtitle =
    isShowSubtitle &&
    (isRealTimeCallMode() ||
      usesAiGateway(Config) ||
      [Provider.Byteplus, Provider.OpenAI, Provider.Google].includes(Config['Provider.TTS']));

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
        msgHistory?.map(({ value, user, isInterrupted, paragraph }, index) => {
          const isUserMsg = user === userId;
          const isRobotMsg = user === Config.BotName || user.includes('voiceChat_');
          if (!isUserMsg && !isRobotMsg) {
            return '';
          }
          return (
            <div key={`msg-container-${index}`} className={styles.mobileLine}>
              <div className={styles.msgName}>
                <div className={styles.avatar}>
                  <img src={isUserMsg ? USER_AVATAR : Icon[scene]} alt="Avatar" />
                </div>
                {isUserMsg ? 'ME' : Name[scene]}
              </div>
              <div
                className={`${styles.sentence} ${isUserMsg ? styles.user : styles.robot}`}
                key={`msg-${index}`}
              >
                <div className={styles.content}>
                  {isUserMsg ? value : <ReplyMarkdown text={value} />}
                  {!isRealTimeCallMode() &&
                  isAIReady &&
                  !paragraph &&
                  !isInterrupted &&
                  (isUserMsg ? isUserTalking : isAITalking) &&
                  index === msgHistory.length - 1 ? (
                    <div className={styles['loading-wrapper']}>
                      <Loading gap={3} className={styles.loading} dotClassName={styles.dot} />
                    </div>
                  ) : null}
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
