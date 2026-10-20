/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import BytePlusRTC, { MediaType } from '@byteplus/rtc';
import { Modal } from '@arco-design/web-react';
import Utils from '@/utils/utils';
import openAPIs from '@/app/index';
import RtcClient from '@/lib/RtcClient';
import {
  clearHistoryMsg,
  localJoinRoom,
  localLeaveRoom,
  updateAIGCState,
  updateFullScreen,
  updateLocalUser,
} from '@/store/slices/room';

import useRtcListeners from '@/lib/listenerHooks';
import { RootState } from '@/store';

import {
  updateMediaInputs,
  updateSelectedDevice,
  setDevicePermissions,
} from '@/store/slices/device';
import logger from '@/utils/logger';
import aigcConfig, { AIGC_PROXY_HOST } from '@/config';

export interface FormProps {
  username: string;
  roomId: string;
  publishAudio: boolean;
}

export const useGetDevicePermission = () => {
  const [permission, setPermission] = useState<{
    audio: boolean;
  }>();

  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      const permission = await RtcClient.checkPermission();
      dispatch(setDevicePermissions(permission));
      setPermission(permission);
    })();
  }, [dispatch]);
  return permission;
};

export const useJoin = (): [
  boolean,
  (formValues: FormProps, fromRefresh: boolean) => Promise<void | boolean>
] => {
  const devicePermissions = useSelector((state: RootState) => state.device.devicePermissions);
  const room = useSelector((state: RootState) => state.room);

  const dispatch = useDispatch();

  const [joining, setJoining] = useState(false);
  const joiningRef = useRef(false);
  const listeners = useRtcListeners();

  const handleAIGCModeStart = async () => {
    if (room.isAIGCEnable) {
      await RtcClient.stopAgent();
      await RtcClient.startAgent();
    } else {
      await RtcClient.startAgent();
    }
    dispatch(updateAIGCState({ isAIGCEnable: true }));
  };

  async function disPatchJoin(formValues: FormProps): Promise<boolean | undefined> {
    const { username, roomId } = formValues;

    if (joiningRef.current) return;
    joiningRef.current = true;
    setJoining(true);
    let engineCreated = false;
    try {
      const isSupported = await BytePlusRTC.isSupported();
      if (!isSupported) {
        Modal.error({
          title: 'RTC Not Supported',
          content:
            'Your browser may not support RTC features. Please try using a different browser or upgrade your browser to try again.',
        });
        return;
      }

      if (!aigcConfig.AppId || aigcConfig.AppId === 'Your AppId') {
        const response = await fetch(`${AIGC_PROXY_HOST}/runtimeConfig`);
        const runtime = await response.json();
        const appId = runtime?.Result?.appId;
        if (!response.ok || typeof appId !== 'string' || !appId.trim()) {
          throw new Error('The local service returned no RTC AppId. Check RTC_APP_ID.');
        }
        aigcConfig.AppId = appId;
      }
      let token = aigcConfig.Token;
      if (!token) {
        // Generate token using API
        // Or you can generate it manually in the console for testing, see README for more information.
        const res = await openAPIs.GenerateRtcAccessToken({
          appID: aigcConfig.AppId,
          roomID: roomId,
          userID: username,
        });
        token = res.token;
      }

      if (!token)
        throw new Error('The local service returned no RTC token. Check the RTC configuration.');

      /** 1. Create RTC Engine */
      await RtcClient.createEngine({
        appId: aigcConfig.AppId,
        roomId,
        uid: username,
      } as any);
      engineCreated = true;

      /** 2 Set events callbacks */
      RtcClient.addEventListeners(listeners);

      /** 3 Join room */

      await RtcClient.joinRoom(token, username);
      console.log(' ------ userJoinRoom\n', `roomId: ${roomId}\n`, `uid: ${username}`);
      /** 4. Get users' devices info */
      const mediaDevices = await RtcClient.getDevices({
        audio: true,
        video: false,
      });

      if (devicePermissions.audio) {
        try {
          await RtcClient.startAudioCapture();
          // RtcClient.setAudioVolume(30);
        } catch (e) {
          logger.debug('No permission for mic');
        }
      }

      dispatch(
        localJoinRoom({
          roomId,
          user: {
            username,
            userId: username,
            publishAudio: true,
            publishVideo: false,
          },
        })
      );
      dispatch(
        updateSelectedDevice({
          selectedMicrophone: mediaDevices.audioInputs[0]?.deviceId,
        })
      );

      dispatch(updateMediaInputs(mediaDevices));

      if (devicePermissions.audio) {
        try {
          await RtcClient.startAudioCapture();
        } catch (e) {
          logger.debug('No permission for mic');
        }
      }

      Utils.setSessionInfo({
        username,
        roomId,
        publishAudio: true,
      });

      await handleAIGCModeStart();
      return true;
    } catch (error) {
      if (engineCreated) {
        await RtcClient.leaveRoom().catch(() => {});
        dispatch(localLeaveRoom());
        dispatch(updateAIGCState({ isAIGCEnable: false }));
        dispatch(clearHistoryMsg());
      }
      const proxyHost = process.env.REACT_APP_AIGC_PROXY_HOST || 'http://localhost:3001';
      Modal.error({
        title: 'Unable to start conversation',
        content:
          error instanceof TypeError && /fetch/i.test(error.message)
            ? `Unable to connect to the local service at ${proxyHost}. Start the Node server and check its configuration, then try again.`
            : error instanceof Error
            ? error.message
            : 'Check the local service and RTC configuration, then try again.',
      });
      return false;
    } finally {
      joiningRef.current = false;
      setJoining(false);
    }
  }

  return [joining, disPatchJoin];
};

export const useLeave = () => {
  const dispatch = useDispatch();
  const leavingRef = useRef(false);

  return async function () {
    if (leavingRef.current) return;
    leavingRef.current = true;
    try {
      try {
        await Promise.allSettled([
          RtcClient.stopAudioCapture(),
          RtcClient.engine?.stopScreenCapture(),
          RtcClient.engine?.stopVideoCapture(),
        ]);
      } finally {
        await RtcClient.leaveRoom();
      }
    } catch (e) {
      logger.debug('leaveRoom error', e);
    } finally {
      dispatch(localLeaveRoom());
      dispatch(updateFullScreen({ isFullScreen: false }));
      dispatch(updateAIGCState({ isAIGCEnable: false }));
      dispatch(clearHistoryMsg());
      leavingRef.current = false;
    }
  };
};

export const useDeviceState = () => {
  const dispatch = useDispatch();
  const room = useSelector((state: RootState) => state.room);
  const localUser = room.localUser;
  const isAudioPublished = localUser.publishAudio;
  const isVideoPublished = localUser.publishVideo;

  const queryDevices = async (type: MediaType) => {
    const mediaDevices = await RtcClient.getDevices({
      audio: type === MediaType.AUDIO,
      video: type === MediaType.VIDEO,
    });
    if (type === MediaType.AUDIO) {
      dispatch(
        updateMediaInputs({
          audioInputs: mediaDevices.audioInputs,
        })
      );
      dispatch(
        updateSelectedDevice({
          selectedMicrophone: mediaDevices.audioInputs[0]?.deviceId,
        })
      );
    } else {
      dispatch(
        updateMediaInputs({
          videoInputs: mediaDevices.videoInputs,
        })
      );
      dispatch(
        updateSelectedDevice({
          selectedCamera: mediaDevices.videoInputs[0]?.deviceId,
        })
      );
    }
    return mediaDevices;
  };

  const switchMic = (publish = true) => {
    if (publish) {
      !isAudioPublished
        ? RtcClient.publishStream(MediaType.AUDIO)
        : RtcClient.unpublishStream(MediaType.AUDIO);
    }
    queryDevices(MediaType.AUDIO);
    !isAudioPublished ? RtcClient.startAudioCapture() : RtcClient.stopAudioCapture();
    dispatch(
      updateLocalUser({
        publishAudio: !localUser.publishAudio,
      })
    );
  };

  const switchCamera = (publish = true) => {
    if (publish) {
      !isVideoPublished
        ? RtcClient.publishStream(MediaType.VIDEO)
        : RtcClient.unpublishStream(MediaType.VIDEO);
    }
    queryDevices(MediaType.VIDEO);
    !localUser.publishVideo ? RtcClient.startVideoCapture() : RtcClient.stopVideoCapture();
    dispatch(
      updateLocalUser({
        publishVideo: !localUser.publishVideo,
      })
    );
  };

  return {
    isAudioPublished,
    isVideoPublished,
    switchMic,
    switchCamera,
  };
};
