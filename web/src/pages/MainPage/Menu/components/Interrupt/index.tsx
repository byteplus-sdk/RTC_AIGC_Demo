import { Switch, Tooltip, Message } from '@arco-design/web-react';
import { IconQuestionCircle } from '@arco-design/web-react/icon';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Config from '@/config';
import RtcClient from '@/lib/RtcClient';
import { clearHistoryMsg } from '@/store/slices/room';
import styles from './index.module.less';

function Interrupt() {
  const dispatch = useDispatch();
  const [enabled, setEnabled] = useState(Config.interruptMode);
  const [loading, setLoading] = useState(false);
  return (
    <div className={styles.interrupt}>
      <div className={styles.label}>
        Voice interruption
        <Tooltip content="Users can interrupt the agent by voice. Changing this setting restarts the conversation.">
          <IconQuestionCircle className={styles.icon} />
        </Tooltip>
      </div>
      <Switch
        size="small"
        checked={enabled}
        loading={loading}
        onChange={async (value) => {
          setLoading(true);
          Config.interruptMode = value;
          try {
            await RtcClient.updateAgent();
            setEnabled(value);
            dispatch(clearHistoryMsg());
          } catch (error) {
            Config.interruptMode = enabled;
            Message.error((error as Error).message);
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
}
export default Interrupt;
