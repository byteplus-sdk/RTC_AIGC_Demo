/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Switch, Tooltip } from '@arco-design/web-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CALL_TYPE } from '@/app/base';
import Config from '@/config';
import { isLlmProviderAllowedForWebSearch } from '@/config/voiceChat/llm';
import RtcClient from '@/lib/RtcClient';
import { useDeviceState } from '@/lib/useCommon';
import { RootState } from '@/store';
import menuStyles from '../../index.module.less';
import styles from '../Interrupt/index.module.less';

function WebSearchToggle() {
  const room = useSelector((state: RootState) => state.room);
  const { isVideoPublished, switchCamera } = useDeviceState();
  const [enabled, setEnabled] = useState(() => Config.LLMWebSearchEnabled);

  const llmProvider = room.aiConfig['Provider.LLM'];
  const allowed = isLlmProviderAllowedForWebSearch(llmProvider);

  useEffect(() => {
    setEnabled(Config.LLMWebSearchEnabled);
  }, [llmProvider]);

  if (room.callMode !== CALL_TYPE.VOICE_CHAT) {
    return null;
  }

  const handleChange = async (v: boolean) => {
    setEnabled(v);
    Config.LLMWebSearchEnabled = v;
    if (v && room.isJoined && isVideoPublished) {
      switchCamera(true);
    }
    if (room.isJoined && RtcClient.audioBotEnabled) {
      await RtcClient.updateAgent();
    }
  };

  return (
    <div className={menuStyles.box}>
      <div className={styles.interrupt}>
        <div className={styles.label}>Web search</div>
        <Tooltip
          content={
            allowed
              ? undefined
              : 'Web search (AskEcho) is only available for ModelArk (Byteplus) and Custom LLM.'
          }
        >
          <div className={styles.value}>
            <Switch
              size="small"
              disabled={!allowed}
              checked={allowed && enabled}
              onChange={handleChange}
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
}

export default WebSearchToggle;
