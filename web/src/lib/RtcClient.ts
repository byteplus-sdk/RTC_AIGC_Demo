/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import VERTC, {
  StreamIndex,
  IRTCEngine,
  RoomProfileType,
  onUserJoinedEvent,
  onUserLeaveEvent,
  MediaType,
  LocalStreamStats,
  RemoteStreamStats,
  StreamRemoveReason,
  LocalAudioPropertiesInfo,
  RemoteAudioPropertiesInfo,
  DeviceInfo,
  NetworkQuality,
  VideoRenderMode,
} from '@byteplus/rtc';
import { Message } from '@arco-design/web-react';
import RTCAIAnsExtension from '@byteplus/rtc/extension-ainr';
import openAPIs from '@/app/index';
import aigc from '@/config';
import Utils from '@/utils/utils';
import { COMMAND, INTERRUPT_PRIORITY } from '@/utils/handler';

export interface IEventListener {
  handleError: (e: { errorCode: any }) => void;
  handleUserJoin: (e: onUserJoinedEvent) => void;
  handleUserLeave: (e: onUserLeaveEvent) => void;
  handleUserPublishStream: (e: { userId: string; mediaType: MediaType }) => void;
  handleUserUnpublishStream: (e: {
    userId: string;
    mediaType: MediaType;
    reason: StreamRemoveReason;
  }) => void;
  handleRemoteStreamStats: (e: RemoteStreamStats) => void;
  handleLocalStreamStats: (e: LocalStreamStats) => void;
  handleLocalAudioPropertiesReport: (e: LocalAudioPropertiesInfo[]) => void;
  handleRemoteAudioPropertiesReport: (e: RemoteAudioPropertiesInfo[]) => void;
  handleAudioDeviceStateChanged: (e: DeviceInfo) => void;
  handleUserStartAudioCapture: (e: { userId: string }) => void;
  handleUserStopAudioCapture: (e: { userId: string }) => void;
  handleRoomBinaryMessageReceived: (e: { userId: string; message: ArrayBuffer }) => void;
  handleNetworkQuality: (
    uplinkNetworkQuality: NetworkQuality,
    downlinkNetworkQuality: NetworkQuality
  ) => void;
}

interface EngineOptions {
  appId: string;
  uid: string;
  roomId: string;
  bid: string | null;
}

export interface BasicBody {
  room_id: string;
  user_id: string;
  login_token?: string | null;
}

export class RtcClient {
  engine!: IRTCEngine;

  config!: EngineOptions;

  basicInfo!: BasicBody;

  #audioCaptureDevice?: string;

  #videoCaptureDevice?: string;

  audioBotEnabled = false;

  audioBotStartTime = 0;

  /**
   * @brief Create RTC engine, which is the first step.
   */
  createEngine = async (props: EngineOptions) => {
    this.config = props;
    this.basicInfo = {
      room_id: props.roomId,
      user_id: props.uid,
    };

    this.engine = VERTC.createEngine(this.config.appId);
    try {
      const AIAnsExtension = new RTCAIAnsExtension();
      await this.engine.registerExtension(AIAnsExtension);
      AIAnsExtension.enable();
    } catch (error) {
      console.error((error as any).message);
    }
  };

  /**
   * @brief Listening for related events.
   */
  addEventListeners = ({
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
  }: IEventListener) => {
    this.engine.on(VERTC.events.onError, handleError);
    this.engine.on(VERTC.events.onUserJoined, handleUserJoin);
    this.engine.on(VERTC.events.onUserLeave, handleUserLeave);
    this.engine.on(VERTC.events.onUserPublishStream, handleUserPublishStream);
    this.engine.on(VERTC.events.onUserUnpublishStream, handleUserUnpublishStream);
    this.engine.on(VERTC.events.onRemoteStreamStats, handleRemoteStreamStats);
    this.engine.on(VERTC.events.onLocalStreamStats, handleLocalStreamStats);
    this.engine.on(VERTC.events.onAudioDeviceStateChanged, handleAudioDeviceStateChanged);
    this.engine.on(VERTC.events.onLocalAudioPropertiesReport, handleLocalAudioPropertiesReport);
    this.engine.on(VERTC.events.onRemoteAudioPropertiesReport, handleRemoteAudioPropertiesReport);

    this.engine.on(VERTC.events.onUserStartAudioCapture, handleUserStartAudioCapture);
    this.engine.on(VERTC.events.onUserStopAudioCapture, handleUserStopAudioCapture);
    this.engine.on(VERTC.events.onRoomBinaryMessageReceived, handleRoomBinaryMessageReceived);
    this.engine.on(VERTC.events.onNetworkQuality, handleNetworkQuality);
  };

  joinRoom = (token: string | null, username: string): Promise<void> => {
    this.engine.enableAudioPropertiesReport({ interval: 1000 });
    return this.engine.joinRoom(
      token,
      `${this.config.roomId!}`,
      {
        userId: this.config.uid!,
        extraInfo: JSON.stringify({
          user_name: username,
          call_scene: 'AIGC',
          user_id: this.config.uid,
        }),
      },
      {
        isAutoPublish: true,
        isAutoSubscribeAudio: true,
        roomProfileType: RoomProfileType.chat,
      }
    );
  };

  leaveRoom = () => {
    this.stopAgent();
    this.engine.leaveRoom();
    VERTC.destroyEngine(this.engine);
    this.#audioCaptureDevice = undefined;
  };

  /**
   * @brief Fetch microphone permission.
   */
  checkPermission(): Promise<{
    video: boolean;
    audio: boolean;
  }> {
    return VERTC.enableDevices({
      video: false,
      audio: true,
    });
  }

  /**
   * @brief Get devices.
   */
  async getDevices(props?: { video?: boolean; audio?: boolean }): Promise<{
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }> {
    const { video = false, audio = true } = props || {};
    let audioInputs: MediaDeviceInfo[] = [];
    let audioOutputs: MediaDeviceInfo[] = [];
    let videoInputs: MediaDeviceInfo[] = [];
    const { video: hasVideoPermission, audio: hasAudioPermission } = await VERTC.enableDevices({
      video,
      audio,
    });
    if (audio) {
      const inputs = await VERTC.enumerateAudioCaptureDevices();
      const outputs = await VERTC.enumerateAudioPlaybackDevices();
      audioInputs = inputs.filter((i) => i.deviceId && i.kind === 'audioinput');
      audioOutputs = outputs.filter((i) => i.deviceId && i.kind === 'audiooutput');
      this.#audioCaptureDevice = audioInputs.filter((i) => i.deviceId)?.[0]?.deviceId;
      if (hasAudioPermission) {
        if (!audioInputs?.length) {
          Message.error('No microphone device found. Please check your device settings first.');
        }
        if (!audioOutputs?.length) {
          Message.error('No speaker device found. Please check your device settings first.');
        }
      } else {
        Message.error(
          "You don't have permission to access the microphone device. Please check the device permission settings first."
        );
      }
    }
    if (video) {
      videoInputs = await VERTC.enumerateVideoCaptureDevices();
      videoInputs = videoInputs.filter((i) => i.deviceId && i.kind === 'videoinput');
      this.#videoCaptureDevice = videoInputs?.[0]?.deviceId;
      if (hasVideoPermission) {
        if (!videoInputs?.length) {
          Message.error('No camera device found. Please check your device settings first.');
        }
      } else {
        Message.error(
          "You don't have permission to access the camera device. Please check the device permission settings first."
        );
      }
    }

    return {
      audioInputs,
      audioOutputs,
      videoInputs,
    };
  }

  startVideoCapture = async (camera?: string) => {
    await this.engine.startVideoCapture(camera || this.#videoCaptureDevice);
  };

  stopVideoCapture = async () => {
    await this.engine.stopVideoCapture();
  };

  startAudioCapture = async (mic?: string) => {
    await this.engine.startAudioCapture(mic || this.#audioCaptureDevice);
  };

  stopAudioCapture = async () => {
    await this.engine.stopAudioCapture();
  };

  publishStream = async (mediaType: MediaType) => {
    await this.engine.publishStream(mediaType);
  };

  unpublishStream = async (mediaType: MediaType) => {
    await this.engine.unpublishStream(mediaType);
  };

  setAudioVolume = (volume: number) => {
    this.engine.setCaptureVolume(StreamIndex.STREAM_INDEX_MAIN, volume);
    this.engine.setCaptureVolume(StreamIndex.STREAM_INDEX_SCREEN, volume);
  };

  /**
   * @brief Switch device
   */
  switchDevice = (deviceType: MediaType, deviceId: string) => {
    if (deviceType === MediaType.AUDIO) {
      this.#audioCaptureDevice = deviceId;
      this.engine.setAudioCaptureDevice(deviceId);
    }
    if (deviceType === MediaType.VIDEO) {
      this.#videoCaptureDevice = deviceId;
      this.engine.setVideoCaptureDevice(deviceId);
    }
    if (deviceType === MediaType.AUDIO_AND_VIDEO) {
      this.#audioCaptureDevice = deviceId;
      this.#videoCaptureDevice = deviceId;
      this.engine.setVideoCaptureDevice(deviceId);
      this.engine.setAudioCaptureDevice(deviceId);
    }
  };

  setRemoteVideoPlayer = (
    userId: string,
    renderDom?: string | HTMLElement,
    renderMode = VideoRenderMode.RENDER_MODE_HIDDEN
  ) => {
    return this.engine.setRemoteVideoPlayer(StreamIndex.STREAM_INDEX_MAIN, {
      renderDom,
      userId,
      renderMode,
    });
  };

  /**
   * @brief Enable AIGC
   */
  startAgent = async () => {
    const roomId = this.basicInfo.room_id;
    const userId = this.basicInfo.user_id;
    aigc.RoomId = roomId;
    aigc.UserId = userId;
    if (this.audioBotEnabled) {
      await this.stopAgent();
    }
    await openAPIs.StartVoiceChat(aigc.config);
    this.audioBotEnabled = true;
    this.audioBotStartTime = Date.now();
    Utils.setSessionInfo({ audioBotEnabled: 'enable' });
  };

  /**
   * @brief Stop AIGC
   */
  stopAgent = async () => {
    const roomId = this.basicInfo.room_id;
    const userId = this.basicInfo.user_id;
    if (this.audioBotEnabled || sessionStorage.getItem('audioBotEnabled')) {
      await openAPIs.StopVoiceChat({
        AppId: aigc.AppId,
        RoomId: roomId,
        TaskId: userId,
      });
      this.audioBotStartTime = 0;
      sessionStorage.removeItem('audioBotEnabled');
    }
    this.audioBotEnabled = false;
  };

  /**
   * @brief Command AIGC
   */
  commandAgent = (command: COMMAND, interruptMode = INTERRUPT_PRIORITY.NONE, message = '') => {
    if (this.audioBotEnabled) {
      this.engine.sendUserBinaryMessage(
        aigc.BotName,
        Utils.string2tlv(
          JSON.stringify({
            Command: command,
            InterruptMode: interruptMode,
            Message: message,
          }),
          'ctrl'
        )
      );
      return;
    }
    console.warn('Interrupt failed, bot not enabled.');
  };

  /**
   * @brief Update AIGC
   */
  updateAgent = async () => {
    if (this.audioBotEnabled) {
      await this.stopAgent();
      await this.startAgent();
    }
  };

  /**
   * @brief Whether AIGC is enabled
   */
  getAudioBotEnabled = () => {
    return this.audioBotEnabled;
  };
}

export default new RtcClient();
