/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useDispatch } from 'react-redux';
import AIChangeCard from '@/components/AIChangeCard';
import aigcConfig from '@/config';
import InvokeButton from '@/pages/MainPage/MainArea/Antechamber/InvokeButton';
import { useJoin } from '@/lib/useCommon';
import { updateFullScreen } from '@/store/slices/room';
import style from './index.module.less';

function Antechamber() {
  const dispatch = useDispatch();
  const [joining, dispatchJoin] = useJoin();
  const username = aigcConfig.UserId;
  const roomId = aigcConfig.config.RoomId;

  const handleJoinRoom = () => {
    if (!joining) {
      dispatch(updateFullScreen({ isFullScreen: false })); // 初始化
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
      <AIChangeCard />
      <InvokeButton onClick={handleJoinRoom} loading={joining} className={style['invoke-btn']} />
    </div>
  );
}

export default Antechamber;
