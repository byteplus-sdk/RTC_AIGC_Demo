/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import VERTC, {
  LocalAudioPropertiesInfo,
  RemoteAudioPropertiesInfo,
  LocalStreamStats,
  MediaType,
  onUserJoinedEvent,
  onUserLeaveEvent,
  RemoteStreamStats,
  StreamRemoveReason,
  StreamIndex,
  DeviceInfo,
  NetworkQuality,
} from '@byteplus/rtc';
import { useDispatch } from 'react-redux';

import {
  IUser,
  remoteUserJoin,
  remoteUserLeave,
  updateLocalUser,
  updateRemoteUser,
  removeAutoPlayFail,
  updateAITalkState,
  updateNetworkQuality,
} from '@/store/slices/room';
import RtcClient, { IEventListener } from './RtcClient';

import { setMicrophoneList, updateSelectedDevice } from '@/store/slices/device';
import { useMessageHandler } from '@/utils/handler';
import store from '@/store';

const useRtcListeners = (): IEventListener => {
  const dispatch = useDispatch();
  const { parser } = useMessageHandler();

  const handleUserJoin = (e: onUserJoinedEvent) => {
    const extraInfo = JSON.parse(e.userInfo.extraInfo || '{}');

    const userId = extraInfo.user_id || e.userInfo.userId;
    const username = extraInfo.user_name || e.userInfo.userId;
    dispatch(
      remoteUserJoin({
        userId,
        username,
      })
    );
  };

  const handleError = (e: { errorCode: typeof VERTC.ErrorCode.DUPLICATE_LOGIN }) => {
    const { errorCode } = e;
    if (errorCode === VERTC.ErrorCode.DUPLICATE_LOGIN) {
      console.log('Kick out');
    }
  };

  const handleUserLeave = (e: onUserLeaveEvent) => {
    dispatch(remoteUserLeave(e.userInfo));
    dispatch(removeAutoPlayFail(e.userInfo));
  };

  const handleUserPublishStream = (e: { userId: string; mediaType: MediaType }) => {
    const { userId, mediaType } = e;
    const payload: IUser = { userId };
    if (mediaType === MediaType.AUDIO) {
      payload.publishAudio = true;
    } else if (mediaType === MediaType.VIDEO) {
      payload.publishVideo = true;
    } else if (mediaType === MediaType.AUDIO_AND_VIDEO) {
      payload.publishAudio = true;
      payload.publishVideo = true;
    }
    const isFullScreen = store.getState().room.isFullScreen;
    RtcClient.setRemoteVideoPlayer(
      userId,
      isFullScreen ? 'remote-video-player' : 'remote-full-player'
    );
    dispatch(updateRemoteUser(payload));
  };

  const handleUserUnpublishStream = (e: {
    userId: string;
    mediaType: MediaType;
    reason: StreamRemoveReason;
  }) => {
    const { userId, mediaType } = e;

    const payload: IUser = { userId };
    if (mediaType === MediaType.AUDIO) {
      payload.publishAudio = false;
    }

    if (mediaType === MediaType.AUDIO_AND_VIDEO) {
      payload.publishAudio = false;
      payload.publishVideo = false;
    }

    RtcClient.setRemoteVideoPlayer(userId);
    dispatch(updateRemoteUser(payload));
  };

  const handleRemoteStreamStats = (e: RemoteStreamStats) => {
    dispatch(
      updateRemoteUser({
        userId: e.userId,
        audioStats: e.audioStats,
      })
    );
  };

  const handleLocalStreamStats = (e: LocalStreamStats) => {
    dispatch(
      updateLocalUser({
        audioStats: e.audioStats,
      })
    );
  };

  const handleLocalAudioPropertiesReport = (e: LocalAudioPropertiesInfo[]) => {
    const localAudioInfo = e.find(
      (audioInfo) => audioInfo.streamIndex === StreamIndex.STREAM_INDEX_MAIN
    );
    if (localAudioInfo) {
      dispatch(
        updateLocalUser({
          audioPropertiesInfo: localAudioInfo.audioPropertiesInfo,
        })
      );
    }
  };

  const handleRemoteAudioPropertiesReport = (e: RemoteAudioPropertiesInfo[]) => {
    const remoteAudioInfo = e
      .filter((audioInfo) => audioInfo.streamKey.streamIndex === StreamIndex.STREAM_INDEX_MAIN)
      .map((audioInfo) => ({
        userId: audioInfo.streamKey.userId,
        audioPropertiesInfo: audioInfo.audioPropertiesInfo,
      }));

    if (remoteAudioInfo.length) {
      dispatch(updateRemoteUser(remoteAudioInfo));
    }
  };

  const handleAudioDeviceStateChanged = async (device: DeviceInfo) => {
    const devices = await RtcClient.getDevices();

    if (device.mediaDeviceInfo.kind === 'audioinput') {
      let deviceId = device.mediaDeviceInfo.deviceId;
      if (device.deviceState === 'inactive') {
        deviceId = devices.audioInputs?.[0].deviceId || '';
      }
      RtcClient.switchDevice(MediaType.AUDIO, deviceId);
      dispatch(setMicrophoneList(devices.audioInputs));

      dispatch(
        updateSelectedDevice({
          selectedMicrophone: deviceId,
        })
      );
    }
  };

  const handleUserStartAudioCapture = (_: { userId: string }) => {
    dispatch(updateAITalkState({ isAITalking: true }));
  };

  const handleUserStopAudioCapture = (_: { userId: string }) => {
    dispatch(updateAITalkState({ isAITalking: false }));
  };

  const handleNetworkQuality = (
    uplinkNetworkQuality: NetworkQuality,
    downlinkNetworkQuality: NetworkQuality
  ) => {
    dispatch(
      updateNetworkQuality({
        networkQuality: Math.floor(
          (uplinkNetworkQuality + downlinkNetworkQuality) / 2
        ) as NetworkQuality,
      })
    );
  };

  const handleRoomBinaryMessageReceived = (event: { userId: string; message: ArrayBuffer }) => {
    const { message } = event;
    parser(message);
  };

  return {
    handleError,
    handleUserJoin,
    handleUserLeave,
    handleUserPublishStream,
    handleUserUnpublishStream,
    handleRemoteStreamStats,
    handleLocalStreamStats,
    handleLocalAudioPropertiesReport,
    handleRemoteAudioPropertiesReport,
    handleAudioDeviceStateChanged,
    handleUserStartAudioCapture,
    handleUserStopAudioCapture,
    handleRoomBinaryMessageReceived,
    handleNetworkQuality,
  };
};

export default useRtcListeners;
