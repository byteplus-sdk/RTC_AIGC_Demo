/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { checkCallConfiguration, CallReadiness } from '@/app/preflight';
import AIChangeCard from '@/components/AIChangeCard';
import aigcConfig from '@/config';
import InvokeButton from '@/pages/MainPage/MainArea/Antechamber/InvokeButton';
import { useJoin } from '@/lib/useCommon';
import { updateFullScreen } from '@/store/slices/room';
import style from './index.module.less';

function Antechamber() {
  const dispatch = useDispatch();
  const [joining, dispatchJoin] = useJoin();
  useSelector((state: RootState) => state.room.aiConfig);
  useSelector((state: RootState) => state.room.scene);
  const configuration = JSON.stringify(aigcConfig.config);
  const [checked, setChecked] = useState<{ configuration: string; result: CallReadiness }>();
  const [attempt, setAttempt] = useState(0);
  const readiness = checked?.configuration === configuration ? checked.result : undefined;
  useEffect(() => {
    const controller = new AbortController();
    setChecked(undefined);
    checkCallConfiguration(JSON.parse(configuration), controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setChecked({ configuration, result });
      },
      () => {
        if (!controller.signal.aborted)
          setChecked({
            configuration,
            result: {
              ready: false,
              issues: [
                {
                  stage: 'service',
                  message: 'Unable to check configuration. Check the local service, then retry.',
                },
              ],
            },
          });
      }
    );
    return () => controller.abort();
  }, [configuration, attempt]);
  const username = aigcConfig.UserId;
  const roomId = aigcConfig.config.RoomId;

  const handleJoinRoom = () => {
    if (!joining && readiness?.ready) {
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
      <InvokeButton
        onClick={handleJoinRoom}
        loading={joining || !readiness}
        disabled={!readiness?.ready || joining}
        label={!readiness ? 'Checking configuration' : undefined}
        className={style['invoke-btn']}
      />
      {readiness && !readiness.ready && (
        <div role="alert">
          {readiness.issues.map((issue) => (
            <p key={issue.stage + issue.message}>{issue.message}</p>
          ))}
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Check again
          </button>
        </div>
      )}
    </div>
  );
}

export default Antechamber;
