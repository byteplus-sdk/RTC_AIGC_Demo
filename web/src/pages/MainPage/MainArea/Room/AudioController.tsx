/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useDispatch, useSelector } from 'react-redux';
import AudioLoading from '@/components/Loading/AudioLoading';
import { RootState } from '@/store';
import RtcClient from '@/lib/RtcClient';
import { COMMAND } from '@/utils/handler';
import { setInterruptMsg } from '@/store/slices/room';
import StopRobotBtn from '@/assets/img/StopRobotBtn.svg';
import style from './index.module.less';

function AudioController(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  const dispatch = useDispatch();
  const room = useSelector((state: RootState) => state.room);
  const volume = room.localUser.audioPropertiesInfo?.linearVolume || 0;
  const isAITalking = room.isAITalking;
  const isUserTalking = room.isAIGCEnable && volume >= 25;

  const handleInterrupt = () => {
    RtcClient.commandAgent(COMMAND.INTERRUPT);
    dispatch(setInterruptMsg());
  };

  return (
    <div className={`${className}`} {...rest}>
      {isAITalking ? (
        <div onClick={handleInterrupt} className={style.interrupt}>
          <img src={StopRobotBtn} alt="StopRobotBtn" />
          <span className={style['interrupt-text']}>Interrupt</span>
        </div>
      ) : (
        <div className={style.text}>Listening...</div>
      )}
      <AudioLoading loading={isUserTalking} />
    </div>
  );
}
export default AudioController;
