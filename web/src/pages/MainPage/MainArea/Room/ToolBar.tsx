/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import BytePlusRTC, { MediaType } from '@byteplus/rtc';
import { useEffect, useRef, useState } from 'react';
import { Drawer, Message } from '@arco-design/web-react';
import { useSelector } from 'react-redux';
import { useDeviceState, useLeave } from '@/lib/useCommon';
import utils from '@/utils/utils';
import Menu from '../../Menu';

import { RootState } from '@/store';
import RtcClient from '@/lib/RtcClient';
import ScreenOnSVG from '@/assets/img/ScreenOn.svg';
import ScreenOffSVG from '@/assets/img/ScreenOff.svg';

import style from './index.module.less';
import MicOpenSVG from '@/assets/img/MicOpen.svg';
import SettingSVG from '@/assets/img/Setting.svg';
import MicCloseSVG from '@/assets/img/MicClose.svg';
import LeaveRoomSVG from '@/assets/img/LeaveRoom.svg';

function ToolBar(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  const [open, setOpen] = useState(false);
  const leaveRoom = useLeave();
  const { aiConfig } = useSelector((state: RootState) => state.room);
  const [screenPublished, setScreenPublished] = useState(false);
  const [screenLoading, setScreenLoading] = useState(false);
  const canShareScreen =
    aiConfig.VisionEnable &&
    !aiConfig.LLMWebSearchEnabled &&
    !aiConfig.CustomMcpList.some((item) => item.URL?.trim());
  const mountedRef = useRef(false);
  const canShareScreenRef = useRef(canShareScreen);
  canShareScreenRef.current = canShareScreen;
  useEffect(() => {
    const engine = RtcClient.engine;
    mountedRef.current = true;
    const onEnded = ({ kind, isScreen }: { kind: string; isScreen: boolean }) => {
      if (kind === 'video' && isScreen) {
        setScreenPublished(false);
        engine.unpublishScreen(MediaType.VIDEO).catch(() => {});
      }
    };
    engine.on(BytePlusRTC.events.onTrackEnded, onEnded);
    return () => {
      mountedRef.current = false;
      engine.off(BytePlusRTC.events.onTrackEnded, onEnded);
    };
  }, []);
  useEffect(() => {
    if (!canShareScreen && screenPublished) {
      RtcClient.engine
        .stopScreenCapture()
        .then(() => setScreenPublished(false))
        .catch(() => {});
    }
  }, [canShareScreen, screenPublished]);
  const toggleScreen = async () => {
    const engine = RtcClient.engine;
    setScreenLoading(true);
    try {
      if (screenPublished) {
        await engine.unpublishScreen(MediaType.VIDEO);
        await engine.stopScreenCapture();
      } else {
        await engine.startScreenCapture({ enableAudio: false });
        if (!mountedRef.current || !canShareScreenRef.current || RtcClient.engine !== engine) {
          await engine.stopScreenCapture();
          return;
        }
        await engine.publishScreen(MediaType.VIDEO);
      }
      if (mountedRef.current) setScreenPublished(!screenPublished);
    } catch (error) {
      await engine.stopScreenCapture().catch(() => {});
      if (mountedRef.current) {
        setScreenPublished(false);
        Message.error((error as Error).message || 'Unable to share screen.');
      }
    } finally {
      if (mountedRef.current) setScreenLoading(false);
    }
  };
  const { isAudioPublished, switchMic } = useDeviceState();
  const handleSetting = () => {
    setOpen(true);
  };
  return (
    <div className={`${className} ${style.btns} ${utils.isMobile() ? style.column : ''}`} {...rest}>
      {utils.isMobile() ? (
        <img src={SettingSVG} onClick={handleSetting} className={style.setting} alt="setting" />
      ) : null}
      <button
        type="button"
        className={style.controlButton}
        aria-label={isAudioPublished ? 'Mute microphone' : 'Unmute microphone'}
        onClick={() => switchMic(true)}
      >
        <img src={isAudioPublished ? MicOpenSVG : MicCloseSVG} className={style.btn} alt="" />
      </button>
      {canShareScreen && !utils.isMobile() && (
        <button
          type="button"
          className={style.controlButton}
          disabled={screenLoading}
          aria-label={screenPublished ? 'Stop sharing screen' : 'Share screen'}
          onClick={toggleScreen}
        >
          <img src={screenPublished ? ScreenOnSVG : ScreenOffSVG} className={style.btn} alt="" />
        </button>
      )}
      <button
        type="button"
        className={style.controlButton}
        aria-label="Leave room"
        onClick={leaveRoom}
      >
        <img src={LeaveRoomSVG} className={style.btn} alt="" />
      </button>
      {utils.isMobile() ? (
        <Drawer title=" Settings" visible={open} onCancel={() => setOpen(false)} width="100%">
          <Menu />
        </Drawer>
      ) : null}
    </div>
  );
}
export default ToolBar;
