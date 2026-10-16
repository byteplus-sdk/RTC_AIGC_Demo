import { useState } from 'react';
import { Switch, Message } from '@arco-design/web-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import RtcClient from '@/lib/RtcClient';
import { updateIsShowSubtitle, updateIsAINREnable } from '@/store/slices/room';
import { isRealTimeCallMode } from '@/app/base';
import DeviceDrawerButton from '../DeviceDrawerButton';
import Interrupt from '../Interrupt';
import WebSearchToggle from '../WebSearchToggle';
import styles from './index.module.less';
import rowStyles from '../Interrupt/index.module.less';

function Operation() {
  const { isJoined, isShowSubtitle, isAINREnable } = useSelector((state: RootState) => state.room);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  return (
    <div className={`${styles.box} ${styles.device}`}>
      <div className={rowStyles.interrupt}>
        <div className={rowStyles.label}>AI noise reduction</div>
        <Switch
          size="small"
          checked={isAINREnable}
          loading={loading}
          onChange={async (value) => {
            setLoading(true);
            try {
              await RtcClient.updateAINR(value);
              dispatch(updateIsAINREnable(value));
            } catch (error) {
              Message.error((error as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
      {!isRealTimeCallMode() && (
        <>
          <Interrupt />
          <WebSearchToggle />
        </>
      )}
      {isJoined && (
        <>
          <div className={rowStyles.interrupt}>
            <div className={rowStyles.label}>Subtitle</div>
            <Switch
              size="small"
              checked={isShowSubtitle}
              onChange={(value) => dispatch(updateIsShowSubtitle(value))}
            />
          </div>
          <DeviceDrawerButton />
        </>
      )}
    </div>
  );
}
export default Operation;
