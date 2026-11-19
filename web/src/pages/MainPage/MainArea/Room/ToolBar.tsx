/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import BytePlusRTC, { MediaType, StreamIndex } from '@byteplus/rtc';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Drawer, Message, Tooltip } from '@arco-design/web-react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useDeviceState, useLeave } from '@/lib/useCommon';
import utils from '@/utils/utils';
import Menu from '../../Menu';

import { RootState } from '@/store';
import RtcClient from '@/lib/RtcClient';
import { updateAIConfig, updateLocalUser } from '@/store/slices/room';
import { isRealTimeCallMode } from '@/app/base';
import { isVisionMode } from '@/config/voiceChat/llm';
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
  const store = useStore<RootState>();
  const screenPublished = Boolean(localUser.publishScreen);
  const idleVisionSource =
    scene === SCENE.SCREEN_READER ? StreamIndex.STREAM_INDEX_SCREEN : StreamIndex.STREAM_INDEX_MAIN;
  const cameraPublished = Boolean(localUser.publishVideo);
  const setScreenPublished = useCallback(
    (value: boolean) => dispatch(updateLocalUser({ publishScreen: value })),
    [dispatch]
  );
  const mediaBusy = useRef(false);
  const realtime = isRealTimeCallMode();
  const supportsVision = realtime ? scene !== SCENE.CUSTOM : isVisionMode(aiConfig.Model);
  const canUseCamera = scene !== SCENE.SCREEN_READER && (realtime || supportsVision);
  const cameraBlocked =
    !canUseCamera ||
    aiConfig.LLMWebSearchEnabled ||
    aiConfig.CustomMcpList.some((item) => item.URL?.trim());
  const [screenLoading, setScreenLoading] = useState(false);
  const canShareScreen =
    supportsVision &&
    !aiConfig.LLMWebSearchEnabled &&
    !aiConfig.CustomMcpList.some((item) => item.URL?.trim());
  const mountedRef = useRef(false);
  const canShareScreenRef = useRef(canShareScreen);
  canShareScreenRef.current = canShareScreen;
  const cameraBlockedRef = useRef(cameraBlocked);
  cameraBlockedRef.current = cameraBlocked;
  const setVisionSource = useCallback(async (source: StreamIndex, engine: typeof RtcClient.engine) => {
    const { aiConfig: current, isAIGCEnable } = store.getState().room;
    const previous = current.VisionSourceType;
    const needsRestart = isAIGCEnable && !RtcClient.audioBotEnabled;
    if (previous === source && !needsRestart) return;
    dispatch(updateAIConfig({ VisionSourceType: source }));
    try {
      if (needsRestart) await RtcClient.updateAgent({ preflight: true, agentExpected: true });
      else if (RtcClient.audioBotEnabled) await RtcClient.updateAgent();
    } catch (error) {
      if (
        mountedRef.current &&
        RtcClient.engine === engine &&
        store.getState().room.aiConfig.VisionSourceType === source
      ) dispatch(updateAIConfig({ VisionSourceType: previous }));
      throw error;
    }
  }, [dispatch, store]);
  useEffect(() => {
    const engine = RtcClient.engine;
    mountedRef.current = true;
    const onEnded = ({ kind, isScreen }: { kind: string; isScreen: boolean }) => {
      if (!mountedRef.current || RtcClient.engine !== engine || mediaBusy.current) return;
      if (kind === 'video' && !isScreen) dispatch(updateLocalUser({ publishVideo: false }));
      if (kind === 'video' && isScreen) {
        setScreenPublished(false);
        void engine
          .unpublishScreen(MediaType.VIDEO)
          .then(async () => {
            if (mountedRef.current && RtcClient.engine === engine && canShareScreenRef.current)
              await setVisionSource(idleVisionSource, engine);
          })
          .catch((error) => Message.error((error as Error).message));
      }
    };
    engine.on(BytePlusRTC.events.onTrackEnded, onEnded);
    return () => {
      mountedRef.current = false;
      engine.off(BytePlusRTC.events.onTrackEnded, onEnded);
    };
  }, [dispatch, setScreenPublished, idleVisionSource, setVisionSource]);
  useEffect(() => {
    if (
      (!canShareScreen || aiConfig.VisionSourceType !== StreamIndex.STREAM_INDEX_SCREEN) &&
      screenPublished &&
      !screenLoading
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
  }, [canShareScreen, screenPublished, aiConfig.VisionSourceType, screenLoading, dispatch]);
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
        const source = screenPublished ? idleVisionSource : StreamIndex.STREAM_INDEX_SCREEN;
        await setVisionSource(source, engine);
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
        if (supportsVision) await setVisionSource(StreamIndex.STREAM_INDEX_MAIN, engine);
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
      !screenLoading
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
  }, [cameraBlocked, cameraPublished, aiConfig.VisionSourceType, screenLoading, dispatch]);
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
      {canUseCamera && (
        <Tooltip
          content={
            cameraBlocked ? 'Camera is unavailable while web search or MCP is enabled.' : undefined
          }
        >
          <span className={style.cameraTrigger}>
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
          </span>
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
