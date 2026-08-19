/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useDispatch } from 'react-redux';
import aigcConfig from '@/config';
import InvokeButton from '@/pages/MainPage/MainArea/Antechamber/InvokeButton';
import { useJoin } from '@/lib/useCommon';
import { updateFullScreen } from '@/store/slices/room';
import style from './index.module.less';

function Antechamber() {
  const dispatch = useDispatch();
  const [joining, dispatchJoin] = useJoin();
  const username = aigcConfig.config.UserId;
  const roomId = aigcConfig.config.RoomId;
  const isAvatarScene = aigcConfig.AvatarEnable;

  const handleJoinRoom = () => {
    if (!joining) {
      dispatch(updateFullScreen({ isFullScreen: !isAvatarScene })); // 初始化
      dispatchJoin(
        {
          username,
          roomId,
          publishAudio: true,
        },
        false
      );
    }
  };

  return (
    <div className={style.wrapper}>
      <div className={style.title}>Welcome to the</div>
      <div className={style.description}>
        Conversational AI Real-time Interaction Experience Hall
      </div>
      <InvokeButton onClick={handleJoinRoom} loading={joining} className={style['invoke-btn']} />
    </div>
  );
}

export default Antechamber;
