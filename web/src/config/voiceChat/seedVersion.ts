/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Provider } from '../basic';

export type SeedVersion = '1.0' | '2.0';

/** Virtual ASR provider keys for UI (maps to Provider.Byteplus + seedAsrVersion). */
export const BYTEPLUS_ASR_V2 = 'BytePlus_asr_2.0' as Provider;
export const BYTEPLUS_ASR_V1 = 'BytePlus_asr_1.0' as Provider;

/** Virtual TTS provider keys for UI (maps to Provider.Byteplus + seedTtsVersion). */
export const BYTEPLUS_TTS_V2 = 'BytePlus_tts_2.0' as Provider;
export const BYTEPLUS_TTS_V1 = 'BytePlus_tts_1.0' as Provider;

export const BYTEPLUS_ASR_LABEL: Record<string, string> = {
  [BYTEPLUS_ASR_V2]: 'Seed ASR 2.0',
  [BYTEPLUS_ASR_V1]: 'Seed ASR 1.0',
};

export const BYTEPLUS_TTS_LABEL: Record<string, string> = {
  [BYTEPLUS_TTS_V2]: 'Seed TTS 2.0',
  [BYTEPLUS_TTS_V1]: 'Seed TTS 1.0',
};

export const isByteplusAsrSplitKey = (key: string) =>
  key === BYTEPLUS_ASR_V1 || key === BYTEPLUS_ASR_V2;

export const isByteplusTtsSplitKey = (key: string) =>
  key === BYTEPLUS_TTS_V1 || key === BYTEPLUS_TTS_V2;

export const seedAsrVersionFromKey = (key: string): SeedVersion =>
  key === BYTEPLUS_ASR_V1 ? '1.0' : '2.0';

export const seedTtsVersionFromKey = (key: string): SeedVersion =>
  key === BYTEPLUS_TTS_V1 ? '1.0' : '2.0';

export const byteplusAsrKeyFromVersion = (version: SeedVersion) =>
  version === '1.0' ? BYTEPLUS_ASR_V1 : BYTEPLUS_ASR_V2;

export const byteplusTtsKeyFromVersion = (version: SeedVersion) =>
  version === '1.0' ? BYTEPLUS_TTS_V1 : BYTEPLUS_TTS_V2;
