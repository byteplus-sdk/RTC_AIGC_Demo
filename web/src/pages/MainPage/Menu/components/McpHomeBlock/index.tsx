/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input, Tooltip } from '@arco-design/web-react';
import { IconMinus, IconPlus } from '@arco-design/web-react/icon';
import { CALL_TYPE } from '@/app/base';
import {
  isLlmProviderAllowedForVoiceChatMcp,
  type LlmCustomMcpEntry,
  VOICE_CHAT_MCP_SUPPORT_HINT,
} from '@/config/voiceChat/llm';
import RtcClient from '@/lib/RtcClient';
import store, { type RootState } from '@/store';
import { updateAIConfig } from '@/store/slices/room';
import menuStyles from '../../index.module.less';
import styles from './index.module.less';

let mcpRowIdSeq = 0;
const newRowId = () => `mcp-row-${++mcpRowIdSeq}`;

type LocalMcpRow = LlmCustomMcpEntry & { rowId: string };

function rowsFromStore(list: LlmCustomMcpEntry[] | undefined): LocalMcpRow[] {
  if (list?.length) {
    return list.map((r) => ({
      Name: r.Name ?? '',
      URL: r.URL ?? '',
      rowId: newRowId(),
    }));
  }
  return [{ Name: '', URL: '', rowId: newRowId() }];
}

function toPayload(rows: LocalMcpRow[]): LlmCustomMcpEntry[] {
  return rows.map(({ Name, URL }) => ({ Name, URL }));
}

function McpHomeBlock() {
  const dispatch = useDispatch();
  const room = useSelector((state: RootState) => state.room);
  const customMcpFromStore = useSelector(
    (state: RootState) => state.room.aiConfig.CustomMcpList as LlmCustomMcpEntry[] | undefined
  );

  const [rows, setRows] = useState<LocalMcpRow[]>(() => rowsFromStore(customMcpFromStore));

  const storeSerializedRef = useRef<string>('');

  useEffect(() => {
    const ser = JSON.stringify(customMcpFromStore ?? []);
    if (ser === storeSerializedRef.current) {
      return;
    }
    storeSerializedRef.current = ser;
    setRows((prev) => {
      const fromStore = customMcpFromStore ?? [];
      if (!fromStore.length) {
        return [{ Name: '', URL: '', rowId: prev[0]?.rowId ?? newRowId() }];
      }
      return fromStore.map((r, i) => ({
        Name: r.Name ?? '',
        URL: r.URL ?? '',
        rowId: prev[i]?.rowId ?? newRowId(),
      }));
    });
  }, [customMcpFromStore]);

  const agentUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAgentUpdate = useCallback(() => {
    if (agentUpdateTimerRef.current) {
      clearTimeout(agentUpdateTimerRef.current);
    }
    agentUpdateTimerRef.current = setTimeout(() => {
      agentUpdateTimerRef.current = null;
      const { isJoined } = store.getState().room;
      if (isJoined && RtcClient.audioBotEnabled) {
        RtcClient.updateAgent();
      }
    }, 450);
  }, []);

  useEffect(
    () => () => {
      if (agentUpdateTimerRef.current) {
        clearTimeout(agentUpdateTimerRef.current);
      }
    },
    []
  );

  const persist = useCallback(
    (next: LocalMcpRow[]) => {
      dispatch(updateAIConfig({ CustomMcpList: toPayload(next) }));
      scheduleAgentUpdate();
    },
    [dispatch, scheduleAgentUpdate]
  );

  const llmProvider = room.aiConfig['Provider.LLM'];
  const mcpAllowed = isLlmProviderAllowedForVoiceChatMcp(llmProvider);
  const mcpLocked = room.isJoined;
  const uiLocked = mcpLocked || !mcpAllowed;

  const updateRow = (rowId: string, patch: Partial<LlmCustomMcpEntry>) => {
    if (uiLocked) {
      return;
    }
    const next = rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r));
    setRows(next);
    persist(next);
  };

  const addRow = () => {
    if (uiLocked) {
      return;
    }
    const next = [...rows, { Name: '', URL: '', rowId: newRowId() }];
    setRows(next);
    persist(next);
  };

  const removeRow = (rowId: string) => {
    if (uiLocked) {
      return;
    }
    const next = rows.filter((r) => r.rowId !== rowId);
    const normalized = next.length ? next : [{ Name: '', URL: '', rowId: newRowId() }];
    setRows(normalized);
    persist(normalized);
  };

  if (room.callMode !== CALL_TYPE.VOICE_CHAT) {
    return null;
  }

  const block = (
    <div className={menuStyles.box}>
      <div className={styles.mcpHeader}>
        <div className={styles.mcpTitle}>MCP</div>
        <Button
          type="text"
          size="mini"
          disabled={uiLocked}
          icon={<IconPlus className={styles.compactIcon} />}
          onClick={addRow}
        />
      </div>
      {rows.map((row) => (
        <div key={row.rowId} className={styles.row}>
          <div className={styles.rowMain}>
            <div className={styles.groupCard}>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Name</span>
                  <Input
                    size="small"
                    value={row.Name}
                    placeholder="Please enter"
                    disabled={uiLocked}
                    onChange={(v) => updateRow(row.rowId, { Name: v })}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>URL</span>
                  <Input
                    size="small"
                    value={row.URL}
                    placeholder="Please enter"
                    disabled={uiLocked}
                    onChange={(v) => updateRow(row.rowId, { URL: v })}
                  />
                </div>
              </div>
            </div>
            {rows.length > 1 ? (
              <Button
                type="text"
                size="mini"
                disabled={uiLocked}
                icon={<IconMinus className={styles.compactIcon} />}
                onClick={() => removeRow(row.rowId)}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );

  const mcpTooltip = !mcpAllowed
    ? VOICE_CHAT_MCP_SUPPORT_HINT
    : mcpLocked
    ? 'MCP cannot be edited during a call. Hang up to change.'
    : undefined;

  return mcpTooltip ? <Tooltip content={mcpTooltip}>{block}</Tooltip> : block;
}

export default McpHomeBlock;
