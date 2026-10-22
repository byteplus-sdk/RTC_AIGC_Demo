import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { StreamIndex, VideoRenderMode } from '@byteplus/rtc';
import { IconExpand, IconShrink } from '@arco-design/web-react/icon';
import { RootState } from '@/store';
import { updateFullScreen } from '@/store/slices/room';
import RtcClient from '@/lib/RtcClient';
import { LocalFullID, RemoteFullID } from '@/components/FullScreenCard';
import UserTag from '@/components/UserTag';
import AIAvatarCard from '@/components/AIAvatarCard';
import CameraCloseNote from '@/assets/img/CameraCloseNote.svg';
import { Name } from '@/config/scene';
import styles from './index.module.less';

export default function CameraArea() {
  const { localUser, remoteUsers, isFullScreen, scene } = useSelector(
    (state: RootState) => state.room
  );
  const dispatch = useDispatch();
  const player = useRef<HTMLDivElement>(null);
  const remote = useRef<HTMLDivElement>(null);
  const published = localUser.publishVideo || localUser.publishScreen;
  const remoteUser = remoteUsers.find((user) => user.publishVideo);
  useEffect(() => {
    if (isFullScreen && !published) dispatch(updateFullScreen({ isFullScreen: false }));
  }, [isFullScreen, published, dispatch]);
  useEffect(() => {
    const engine = RtcClient.engine;
    const stream = localUser.publishScreen
      ? StreamIndex.STREAM_INDEX_SCREEN
      : StreamIndex.STREAM_INDEX_MAIN;
    if (published) {
      engine.setLocalVideoPlayer(stream, {
        renderDom: isFullScreen ? LocalFullID : player.current!,
        renderMode: localUser.publishScreen
          ? VideoRenderMode.RENDER_MODE_FILL
          : VideoRenderMode.RENDER_MODE_HIDDEN,
      });
    }
    if (remoteUser?.userId) {
      RtcClient.setRemoteVideoPlayer(
        remoteUser.userId,
        isFullScreen ? remote.current! : RemoteFullID
      );
    }
    return () => {
      try {
        engine.setLocalVideoPlayer(stream);
      } catch {}
    };
  }, [published, localUser.publishScreen, remoteUser?.userId, isFullScreen]);
  return (
    <div className={styles['camera-wrapper']}>
      <UserTag name={isFullScreen ? Name[scene] : 'Me'} className={styles.previewTag} />
      {isFullScreen ? (
        <>
          <div ref={remote} className={styles.previewPlayer} />
          {!remoteUser && (
            <AIAvatarCard showStatus showUserTag={false} className={styles.previewAvatar} />
          )}
        </>
      ) : published ? (
        <div ref={player} className={styles.previewPlayer} />
      ) : (
        <div className={styles.previewPlaceholder}>
          <img src={CameraCloseNote} alt="Camera is off" />
        </div>
      )}
      {(published || isFullScreen) && (
        <button
          type="button"
          className={styles.expandPreview}
          aria-label={isFullScreen ? 'Minimize local preview' : 'Expand local preview'}
          onClick={() => dispatch(updateFullScreen({ isFullScreen: !isFullScreen }))}
        >
          {isFullScreen ? <IconShrink /> : <IconExpand />}
        </button>
      )}
    </div>
  );
}
