import { Button, Dropdown, Menu, Message, Modal, Tooltip } from '@arco-design/web-react';
import { IconDown, IconQuestionCircle } from '@arco-design/web-react/icon';
import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { clearHistoryMsg, updateAIConfig } from '@/store/slices/room';
import { THINKING_TYPE } from '@/config/voiceChat/llm';
import RtcClient from '@/lib/RtcClient';
import styles from './index.module.less';

export default function Deepthinking() {
  const value = useSelector((state: RootState) => state.room.aiConfig.ThinkingType);
  const dispatch = useDispatch();
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const apply = async (next: THINKING_TYPE) => {
    if (busy.current || next === value) return;
    busy.current = true;
    setLoading(true);
    dispatch(updateAIConfig({ ThinkingType: next }));
    try {
      await RtcClient.updateAgent();
      dispatch(clearHistoryMsg());
    } catch (error) {
      dispatch(updateAIConfig({ ThinkingType: value }));
      Message.error((error as Error).message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };
  const choose = (next: THINKING_TYPE) => {
    if (next === THINKING_TYPE.ENABLED) {
      Modal.confirm({
        title: 'Enable Deep Thinking Mode',
        content: 'Enabling deep thinking increases response latency and restarts the conversation.',
        onOk: () => apply(next),
      });
    } else void apply(next);
  };
  return (
    <div className={`${styles.box} ${styles.device}`}>
      <div className={styles.label}>
        Deep Thinking
        <Tooltip content="Changing deep thinking mode restarts the conversation.">
          <IconQuestionCircle className={styles.icon} />
        </Tooltip>
      </div>
      <Dropdown
        trigger="click"
        droplist={
          <Menu>
            <Menu.Item
              key="enabled"
              disabled={loading}
              onClick={() => choose(THINKING_TYPE.ENABLED)}
            >
              Enable
            </Menu.Item>
            <Menu.Item
              key="disabled"
              disabled={loading}
              onClick={() => choose(THINKING_TYPE.DISABLED)}
            >
              Disable
            </Menu.Item>
          </Menu>
        }
      >
        <Button type="text" loading={loading} disabled={loading}>
          {value === THINKING_TYPE.ENABLED ? 'Enable' : 'Disable'} <IconDown />
        </Button>
      </Dropdown>
    </div>
  );
}
