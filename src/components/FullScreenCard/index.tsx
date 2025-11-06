/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useSelector } from 'react-redux';
import UserTag from '../UserTag';
import style from './index.module.less';
import { RootState } from '@/store';
import Config from '../../config';

export const LocalFullID = 'local-full-player';
export const RemoteFullID = 'remote-full-player';

function FullScreenCard() {
  const isFullScreen = useSelector((state: RootState) => state.room.isFullScreen);
  return (
    <>
      <div className={`${style.card} ${!isFullScreen ? style.hidden : ''}`} id={LocalFullID}>
        <UserTag name="Me" className={style.tag} />
      </div>
      <div
        className={`${style.card} ${isFullScreen ? style.hidden : ''} ${style['blur-bg']}`}
        style={{ backgroundImage: `url(${Config.BackgroundUrl})` }}
      />
      <div
        className={`${style.card} ${isFullScreen ? style.hidden : ''}`}
        style={{ background: 'unset' }}
      >
        <div id={RemoteFullID} style={{ width: '60%', height: '100%' }} />
        <UserTag name="AI" className={style.tag} />
      </div>
    </>
  );
}

export default FullScreenCard;
