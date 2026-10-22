import BytePlusRTC from '@byteplus/rtc';
import { Button, Tag, Tooltip, Typography } from '@arco-design/web-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import AISettings from '@/components/AISettings';
import { isRealTimeCallMode } from '@/app/base';
import Operation from './components/Operation';
import SessionTime from './components/SessionTime';
import Deepthinking from './components/Deepthinking';
import { isDeepThinkingMode } from '@/config/voiceChat/llm';
import McpHomeBlock from './components/McpHomeBlock';
import styles from './index.module.less';

function Menu() {
  const { isJoined, roomId, aiConfig } = useSelector((state: RootState) => state.room);
  return (
    <div className={styles.wrapper}>
      <div className={`${styles.box} ${styles.info}`}>
        <div className={styles.bold}>
          <SessionTime />
        </div>
        <div className={styles.buttonArea}>
          <Button
            className={styles.getMore}
            href="https://docs.byteplus.com/en/docs/byteplus-rtc/docs-1310537"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </Button>
        </div>
      </div>
      <AISettings />
      {!isRealTimeCallMode() && isDeepThinkingMode(aiConfig.Model) && <Deepthinking />}
      <Operation />
      {!isRealTimeCallMode() && <McpHomeBlock />}
      <div className={`${styles.box} ${styles.info}`}>
        <div className={styles.bold}>
          Mode <Tag size="small">{isRealTimeCallMode() ? 'REALTIME' : 'FLEXIBLE'}</Tag>
        </div>
        <div className={styles.bold}>Demo version 1.4.0</div>
        <div className={styles.bold}>SDK version {BytePlusRTC.getSdkVersion()}</div>
        {isJoined && (
          <div className={styles.gray}>
            RoomID
            <Tooltip content={roomId || '-'}>
              <Typography.Paragraph ellipsis={{ rows: 1 }} className={styles.value}>
                {roomId || '-'}
              </Typography.Paragraph>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
export default Menu;
