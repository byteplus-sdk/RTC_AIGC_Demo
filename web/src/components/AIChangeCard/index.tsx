import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Icon, Name, SCENES, SCENE_TAG, getSceneSettings } from '@/config/scene';
import { updateAIConfig, updateScene } from '@/store/slices/room';
import { isRealTimeCallMode } from '@/app/base';
import CheckScene from './CheckScene';
import styles from './index.module.less';

function AIChangeCard() {
  const scene = useSelector((state: RootState) => state.room.scene);
  const dispatch = useDispatch();
  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        <img src={Icon[scene]} alt={Name[scene]} />
      </div>
      <div className={styles.title}>
        <div>Hi, welcome to experience BytePlus RTC Conversational AI solution.</div>
        <div className={styles.desc}>
          Realtime audio chat, vision understanding, digital human interaction - Explore endless
          conversation possibilities.
        </div>
      </div>
      {!isRealTimeCallMode() && (
        <div className={styles.sceneContainer}>
          {SCENES.map((key) => (
            <CheckScene
              key={key}
              title={Name[key]}
              icon={Icon[key]}
              tag={SCENE_TAG[key]}
              checked={scene === key}
              onClick={() => {
                dispatch(updateAIConfig(getSceneSettings(key)));
                dispatch(updateScene(key));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export default AIChangeCard;
