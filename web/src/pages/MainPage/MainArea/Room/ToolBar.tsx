/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import BytePlusRTC, { MediaType, StreamIndex } from '@byteplus/rtc';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Drawer, Message, Tooltip } from '@arco-design/web-react';
import { useDispatch, useSelector } from 'react-redux';
import { useDeviceState, useLeave } from '@/lib/useCommon';
import utils from '@/utils/utils';
import Menu from '../../Menu';

import { RootState } from '@/store';
import RtcClient from '@/lib/RtcClient';
import { updateAIConfig, updateLocalUser } from '@/store/slices/room';
import { SCENE } from '@/config/scene';
import CameraOpenSVG from '@/assets/img/CameraOpen.svg';
import CameraCloseSVG from '@/assets/img/CameraClose.svg';
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
  const { aiConfig, localUser, scene } = useSelector((state: RootState) => state.room);
  const dispatch = useDispatch();
  const screenPublished = Boolean(localUser.publishScreen);
  const cameraPublished = Boolean(localUser.publishVideo);
  const setScreenPublished = useCallback(
    (value: boolean) => dispatch(updateLocalUser({ publishScreen: value })),
    [dispatch]
  );
  const mediaBusy = useRef(false);
  const cameraBlocked =
    scene === SCENE.SCREEN_READER ||
    aiConfig.LLMWebSearchEnabled ||
    aiConfig.CustomMcpList.some((item) => item.URL?.trim());
  const [screenLoading, setScreenLoading] = useState(false);
  const canShareScreen =
    aiConfig.VisionEnable &&
    !aiConfig.LLMWebSearchEnabled &&
    !aiConfig.CustomMcpList.some((item) => item.URL?.trim());
  const mountedRef = useRef(false);
  const canShareScreenRef = useRef(canShareScreen);
  canShareScreenRef.current = canShareScreen;
  const cameraBlockedRef = useRef(cameraBlocked);
  cameraBlockedRef.current = cameraBlocked;
  useEffect(() => {
    const engine = RtcClient.engine;
    mountedRef.current = true;
    const onEnded = ({ kind, isScreen }: { kind: string; isScreen: boolean }) => {
      if (!mountedRef.current || RtcClient.engine !== engine || mediaBusy.current) return;
      if (kind === 'video' && !isScreen) dispatch(updateLocalUser({ publishVideo: false }));
      if (kind === 'video' && isScreen) {
        setScreenPublished(false);
        dispatch(updateAIConfig({ VisionSourceType: StreamIndex.STREAM_INDEX_MAIN }));
        void engine
          .unpublishScreen(MediaType.VIDEO)
          .then(async () => {
            if (
              mountedRef.current &&
              RtcClient.engine === engine &&
              canShareScreenRef.current &&
              RtcClient.audioBotEnabled
            )
              await RtcClient.updateAgent();
          })
          .catch((error) => Message.error((error as Error).message));
      }
    };
    engine.on(BytePlusRTC.events.onTrackEnded, onEnded);
    return () => {
      mountedRef.current = false;
      engine.off(BytePlusRTC.events.onTrackEnded, onEnded);
    };
  }, [dispatch, setScreenPublished]);
  useEffect(() => {
    if (
      (!canShareScreen || aiConfig.VisionSourceType !== StreamIndex.STREAM_INDEX_SCREEN) &&
      screenPublished &&
      !mediaBusy.current
    ) {
      const engine = RtcClient.engine;
      void engine
        .unpublishScreen(MediaType.VIDEO)
        .then(() => engine.stopScreenCapture())
        .then(() => {
          if (mountedRef.current && RtcClient.engine === engine) {
            dispatch(updateLocalUser({ publishScreen: false }));
          }
        })
        .catch((error) => Message.error((error as Error).message));
    }
  }, [canShareScreen, screenPublished, aiConfig.VisionSourceType, dispatch]);
  const toggleScreen = async () => {
    if (mediaBusy.current) return;
    mediaBusy.current = true;
    const engine = RtcClient.engine;
    setScreenLoading(true);
    try {
      if (screenPublished) {
        await engine.unpublishScreen(MediaType.VIDEO);
        await engine.stopScreenCapture();
      } else {
        if (cameraPublished) {
          await engine.unpublishStream(MediaType.VIDEO);
          if (!mountedRef.current || RtcClient.engine !== engine) return;
          await engine.stopVideoCapture();
          if (!mountedRef.current || RtcClient.engine !== engine) return;
          dispatch(updateLocalUser({ publishVideo: false }));
        }
        await engine.startScreenCapture({ enableAudio: false });
        if (!mountedRef.current || !canShareScreenRef.current || RtcClient.engine !== engine) {
          await engine.stopScreenCapture();
          return;
        }
        await engine.publishScreen(MediaType.VIDEO);
      }
      if (mountedRef.current && RtcClient.engine === engine) {
        setScreenPublished(!screenPublished);
        dispatch(
          updateAIConfig({
            VisionSourceType: screenPublished
              ? StreamIndex.STREAM_INDEX_MAIN
              : StreamIndex.STREAM_INDEX_SCREEN,
          })
        );
        if (RtcClient.audioBotEnabled) await RtcClient.updateAgent();
      }
    } catch (error) {
      await engine.unpublishScreen(MediaType.VIDEO).catch(() => {});
      await engine.stopScreenCapture().catch(() => {});
      if (mountedRef.current && RtcClient.engine === engine) {
        setScreenPublished(false);
        Message.error((error as Error).message || 'Unable to share screen.');
      }
    } finally {
      mediaBusy.current = false;
      if (mountedRef.current) setScreenLoading(false);
    }
  };
  const toggleCamera = async () => {
    if (mediaBusy.current || cameraBlockedRef.current) return;
    mediaBusy.current = true;
    setScreenLoading(true);
    const engine = RtcClient.engine;
    try {
      if (cameraPublished) {
        await engine.unpublishStream(MediaType.VIDEO);
        await engine.stopVideoCapture();
      } else {
        if (screenPublished) {
          await engine.unpublishScreen(MediaType.VIDEO);
          if (!mountedRef.current || RtcClient.engine !== engine) return;
          await engine.stopScreenCapture();
          if (!mountedRef.current || RtcClient.engine !== engine) return;
          dispatch(updateLocalUser({ publishScreen: false }));
        }
        await engine.startVideoCapture();
        if (!mountedRef.current || cameraBlockedRef.current || RtcClient.engine !== engine) {
          await engine.stopVideoCapture();
          return;
        }
        await engine.publishStream(MediaType.VIDEO);
      }
      if (mountedRef.current && RtcClient.engine === engine) {
        dispatch(updateLocalUser({ publishVideo: !cameraPublished }));
        dispatch(updateAIConfig({ VisionSourceType: StreamIndex.STREAM_INDEX_MAIN }));
        if (aiConfig.VisionEnable && RtcClient.audioBotEnabled) await RtcClient.updateAgent();
      }
    } catch (error) {
      await engine.unpublishStream(MediaType.VIDEO).catch(() => {});
      await engine.stopVideoCapture().catch(() => {});
      if (mountedRef.current && RtcClient.engine === engine) {
        dispatch(updateLocalUser({ publishVideo: false }));
        Message.error((error as Error).message || 'Unable to start camera.');
      }
    } finally {
      mediaBusy.current = false;
      if (mountedRef.current) setScreenLoading(false);
    }
  };
  useEffect(() => {
    if (
      (cameraBlocked || aiConfig.VisionSourceType !== StreamIndex.STREAM_INDEX_MAIN) &&
      cameraPublished &&
      !mediaBusy.current
    ) {
      const engine = RtcClient.engine;
      void engine
        .unpublishStream(MediaType.VIDEO)
        .then(() => engine.stopVideoCapture())
        .then(() => {
          if (mountedRef.current && RtcClient.engine === engine)
            dispatch(updateLocalUser({ publishVideo: false }));
        })
        .catch((error) => Message.error((error as Error).message));
    }
  }, [cameraBlocked, cameraPublished, aiConfig.VisionSourceType, dispatch]);
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
      {scene !== SCENE.SCREEN_READER && (
        <Tooltip
          content={
            cameraBlocked ? 'Camera is unavailable while web search or MCP is enabled.' : undefined
          }
        >
          <button
            type="button"
            className={style.controlButton}
            disabled={screenLoading || cameraBlocked}
            aria-label={cameraPublished ? 'Turn off camera' : 'Turn on camera'}
            onClick={toggleCamera}
          >
            <img
              src={cameraPublished ? CameraOpenSVG : CameraCloseSVG}
              className={style.btn}
              alt=""
            />
          </button>
        </Tooltip>
      )}
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
