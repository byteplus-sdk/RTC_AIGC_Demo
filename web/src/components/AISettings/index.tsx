/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Button, Drawer, Input } from '@arco-design/web-react';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import isEqual from 'lodash/isEqual';
import { IconSwap } from '@arco-design/web-react/icon';
import aigcConfig, { ArkVoiceDescription, ArkTts2VoiceDescription, VendorSVG } from '@/config';
import { ASR_PROVIDER_OPTIONS, Provider } from '@/config/basic';
import RtcClient from '@/lib/RtcClient';
import { clearHistoryMsg, updateAIConfig } from '@/store/slices/room';
import { RootState } from '@/store';
import AnchorTitle from '../AnchorTitle';
import { ConfigFactory } from '@/config/config';
import CheckBoxSelector from '../CheckBoxSelector';
import TitleCard from '../TitleCard';
import utils from '@/utils/utils';
import { isRealTimeCallMode } from '@/app/base';
import {
  AMAZON_VOICE_TYPE,
  BYTE_PLUS_VOICE_TYPE,
  BYTE_PLUS_TTS_2_VOICE_TYPE,
  GOOGLE_VOICE_TYPE,
  OPENAI_VOICE_TYPE,
  getSeedTtsVersionFromVoice,
} from '@/config/voiceChat/tts';
import {
  BYTEPLUS_ASR_LABEL,
  BYTEPLUS_ASR_V1,
  BYTEPLUS_ASR_V2,
  BYTEPLUS_TTS_V1,
  BYTEPLUS_TTS_V2,
  byteplusAsrKeyFromVersion,
  byteplusTtsKeyFromVersion,
  seedAsrVersionFromKey,
  seedTtsVersionFromKey,
} from '@/config/voiceChat/seedVersion';
import { ModelMap, isLlmProviderAllowedForWebSearch } from '@/config/voiceChat/llm';
import { AvatarMap, RealtimeAvatarMap } from '@/config/voiceChat/avatar';
import styles from './index.module.less';

const formatOptions = (options: Provider[], provider?: Provider) =>
  options.map((key) => {
    return {
      key,
      label: utils.capitalizeFirstLetter(key),
      value: key,
      icon: VendorSVG[provider || key],
    };
  });

function getAsrVendorLabel(provider: Provider): string {
  const row = ASR_PROVIDER_OPTIONS.find((o) => o.value === provider);
  return row?.label ?? utils.capitalizeFirstLetter(provider);
}

/** ASR Provider Selector Options — expanded with Seed ASR 1.0/2.0 virtual keys at render time. */
const expandByteplusAsrProviders = (providers: Provider[]): Provider[] => {
  const idx = providers.indexOf(Provider.Byteplus);
  if (idx !== -1) {
    providers.splice(idx, 1, BYTEPLUS_ASR_V2, BYTEPLUS_ASR_V1);
  }
  return providers;
};

const formatAsrOptions = (options: Provider[]) =>
  options.map((key) => ({
    key,
    label: BYTEPLUS_ASR_LABEL[key] || getAsrVendorLabel(key as Provider),
    value: key,
    icon: VendorSVG[key === BYTEPLUS_ASR_V1 || key === BYTEPLUS_ASR_V2 ? Provider.Byteplus : key],
  }));

const formatVoiceTypeOptions = (options: {
  [key in Provider]?: { [key: string]: any };
}) => {
  return Object.keys(options).reduce<Record<string, ReturnType<typeof formatOptions>>>(
    (acc, key) => {
      const provider = key as Provider;
      const voices = options[provider];
      return {
        ...acc,
        [provider]: (Object.keys(voices || {}) as Provider[]).map((option) => ({
          key: option,
          label: utils.capitalizeFirstLetter(option),
          value: voices![option],
          icon: VendorSVG[provider || option],
          description:
            ArkVoiceDescription[voices![option] as BYTE_PLUS_VOICE_TYPE] ||
            ArkTts2VoiceDescription[voices![option] as BYTE_PLUS_TTS_2_VOICE_TYPE] ||
            '',
        })),
      };
    },
    {}
  );
};

const formatModelTypeOptions = (options: {
  [key in Provider]?: { [key: string]: any };
}) => {
  return Object.keys(options).reduce<Record<string, ReturnType<typeof formatOptions>>>(
    (acc, key) => {
      const provider = key as Provider;
      const models = options[provider];
      return {
        ...acc,
        [provider]: (Object.keys(models || {}) as Provider[]).map((option) => ({
          key: option,
          label: utils.capitalizeFirstLetter(option),
          value: models![option].endPointId,
          icon: models![option].icon || VendorSVG[provider || option],
          description: models![option].description || '',
        })),
      };
    },
    {}
  );
};

const formatAvatarTypeOptions = (options: {
  [key in Provider]?: { [key: string]: any };
}) => {
  const result = Object.keys(options).reduce<Record<string, ReturnType<typeof formatOptions>>>(
    (acc, key) => {
      const provider = key as Provider;
      const avatar = options[provider];
      return {
        ...acc,
        [provider]: (Object.keys(avatar || {}) as Provider[]).map((option) => ({
          key: option,
          label: utils.capitalizeFirstLetter(option),
          value: avatar![option].avatarRole,
          icon: avatar![option].icon || VendorSVG[provider || option],
          description: avatar![option].description || '',
        })),
      };
    },
    {}
  );
  return result;
};

function AISettings() {
  const dispatch = useDispatch();
  const room = useSelector((state: RootState) => state.room);

  const getSettings = () => ({
    'Provider.LLM': aigcConfig['Provider.LLM'],
    'Provider.TTS': aigcConfig['Provider.TTS'],
    'Provider.ASR': aigcConfig['Provider.ASR'],
    'Provider.Avatar': aigcConfig['Provider.Avatar'],
    avatar: aigcConfig.avatar,
    voice: aigcConfig.voice,
    endPointId: aigcConfig.endPointId,
    WelcomeMessage: aigcConfig.WelcomeMessage,
    SystemMessages: aigcConfig.SystemMessages,
    SeedAsrVersion: aigcConfig.SeedAsrVersion,
    SeedTtsVersion: aigcConfig.SeedTtsVersion,
  });

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Partial<ConfigFactory>>(getSettings());
  const infos = useMemo(() => {
    const allVoices = {
      ...OPENAI_VOICE_TYPE,
      ...BYTE_PLUS_VOICE_TYPE,
      ...BYTE_PLUS_TTS_2_VOICE_TYPE,
      ...AMAZON_VOICE_TYPE,
      ...GOOGLE_VOICE_TYPE,
    };
    const allModels = {
      ...ModelMap.BytePlusArk,
      ...ModelMap.openai,
    };
    return isRealTimeCallMode()
      ? [
          `TTS ${Object.keys(OPENAI_VOICE_TYPE).find(
            (key) =>
              OPENAI_VOICE_TYPE[key as keyof typeof OPENAI_VOICE_TYPE] === room.aiConfig.voice
          )}`,
          room.aiConfig['Provider.Avatar'] !== Provider.None
            ? `Avatar ${`${utils.capitalizeFirstLetter(room.aiConfig.avatar).substring(0, 12)}...`}`
            : void 0,
        ].filter(Boolean)
      : [
          `TTS ${Object.keys(allVoices).find(
            (key) => allVoices[key as keyof typeof allVoices] === room.aiConfig.voice
          )}`,
          `LLM ${Object.keys(allModels).find(
            (key) =>
              allModels[key as keyof typeof allModels].endPointId === room.aiConfig.endPointId
          )}`,
          `ASR ${
            room.aiConfig['Provider.ASR'] === Provider.Byteplus
              ? room.aiConfig.SeedAsrVersion === '2.0'
                ? 'Seed ASR 2.0'
                : 'Seed ASR 1.0'
              : getAsrVendorLabel(room.aiConfig['Provider.ASR'])
          }`,
          room.aiConfig['Provider.Avatar'] !== Provider.None
            ? `Avatar ${`${utils.capitalizeFirstLetter(room.aiConfig.avatar).substring(0, 12)}...`}`
            : void 0,
        ].filter(Boolean);
  }, [
    room.aiConfig.voice,
    room.aiConfig.endPointId,
    room.aiConfig['Provider.ASR'],
    room.aiConfig.SeedAsrVersion,
    room.aiConfig['Provider.Avatar'],
    room.aiConfig.avatar,
  ]);

  const handleClick = () => {
    setOpen(true);
  };

  const propsChangedHandler =
    (key: string, decorator?: (...args: any[]) => any) => (value: string) => {
      setData((prev) => ({
        ...prev,
        [key]: decorator?.(value) || value,
      }));
    };

  const handleUpdateConfig = async () => {
    if (!isEqual(data, getSettings())) {
      setLoading(true);
      const payload: Partial<ConfigFactory> = { ...data };
      const llmProv = payload['Provider.LLM'] ?? room.aiConfig['Provider.LLM'];
      if (!isLlmProviderAllowedForWebSearch(llmProv)) {
        payload.LLMWebSearchEnabled = false;
      }
      dispatch(updateAIConfig(payload));
      await RtcClient.updateAgent();
      setLoading(false);
      dispatch(clearHistoryMsg());
    }
    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      setData(getSettings());
    }
  }, [open]);

  return (
    <>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.title}>AI Character</div>
          <div className={styles.button} onClick={handleClick}>
            <div className={styles['button-wrapper']}>
              <div className={styles['button-text']}>Configure</div>
            </div>
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.infos}>
          {infos.map((info) => (
            <div key={info} className={styles.info}>
              {info}
            </div>
          ))}
        </div>
      </div>
      <Drawer
        width={utils.isMobile() ? '100%' : 870}
        closable={false}
        maskClosable={false}
        escToExit={false}
        title={null}
        className={styles.container}
        style={{
          padding: utils.isMobile() ? '0px' : '16px 8px',
        }}
        footer={
          <div className={styles.footer}>
            <div className={styles.suffix}>
              The AI configuration you modified will not be saved after exiting the room.
            </div>
            <Button loading={loading} className={styles.cancel} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={loading} className={styles.confirm} onClick={handleUpdateConfig}>
              Confirm
            </Button>
          </div>
        }
        visible={open}
        onCancel={() => setOpen(false)}
      >
        <div className={styles.title}>
          <span className={styles['special-text']}> AI Settings</span>
        </div>
        <div className={styles['sub-title']}>
          We have configured the basic parameters for you, and you can also customize the settings
          according to your own needs.{' '}
        </div>
        <div className={styles.configuration}>
          <AnchorTitle content="Character setting" />
          <TitleCard title="Prompt" className={styles.prompt}>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 6 }}
              placeholder="prompt"
              value={data.SystemMessages?.[0]}
              onChange={propsChangedHandler('SystemMessages', (val) => [val])}
            />
          </TitleCard>
          <TitleCard title="Welcome speech" className={styles.welcomeSpeech}>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="welcome speech"
              value={data.WelcomeMessage}
              onChange={propsChangedHandler('WelcomeMessage')}
            />
          </TitleCard>
          <TitleCard title="TTS">
            <CheckBoxSelector
              label="TTS"
              data={formatVoiceTypeOptions(
                isRealTimeCallMode()
                  ? {
                      [Provider.OpenAI]: OPENAI_VOICE_TYPE,
                    }
                  : {
                      [BYTEPLUS_TTS_V2]: BYTE_PLUS_TTS_2_VOICE_TYPE,
                      [BYTEPLUS_TTS_V1]: BYTE_PLUS_VOICE_TYPE,
                      [Provider.OpenAI]: OPENAI_VOICE_TYPE,
                      [Provider.Amazon]: AMAZON_VOICE_TYPE,
                      [Provider.Google]: GOOGLE_VOICE_TYPE,
                    }
              )}
              moreProps={{
                icon: <IconSwap style={{ fontSize: '12px' }} />,
                text: 'Switch',
              }}
              checked={
                data['Provider.TTS'] === Provider.Byteplus
                  ? byteplusTtsKeyFromVersion(data.SeedTtsVersion || '2.0')
                  : data['Provider.TTS']
              }
              onChange={(voice) => {
                propsChangedHandler('voice')(voice);
                const isBpVoice =
                  Object.values(BYTE_PLUS_VOICE_TYPE).includes(voice as BYTE_PLUS_VOICE_TYPE) ||
                  Object.values(BYTE_PLUS_TTS_2_VOICE_TYPE).includes(
                    voice as BYTE_PLUS_TTS_2_VOICE_TYPE
                  );
                if (isBpVoice) {
                  setData((prev) => ({
                    ...prev,
                    voice: voice as ConfigFactory['voice'],
                    'Provider.TTS': Provider.Byteplus,
                    SeedTtsVersion: getSeedTtsVersionFromVoice(voice as ConfigFactory['voice']),
                  }));
                }
              }}
              onChecked={(v) => {
                if (v === BYTEPLUS_TTS_V1 || v === BYTEPLUS_TTS_V2) {
                  setData((prev) => ({
                    ...prev,
                    'Provider.TTS': Provider.Byteplus,
                    SeedTtsVersion: seedTtsVersionFromKey(v),
                  }));
                  return;
                }
                propsChangedHandler('Provider.TTS')(v);
              }}
              value={data.voice}
              placeHolder="Please select the voice you need"
            />
          </TitleCard>
          {!isRealTimeCallMode() ? (
            <TitleCard title="LLM">
              <CheckBoxSelector
                label="LLM Models"
                data={formatModelTypeOptions(ModelMap)}
                moreProps={{
                  icon: <IconSwap style={{ fontSize: '12px' }} />,
                  text: 'Switch',
                }}
                checked={data['Provider.LLM']}
                onChange={propsChangedHandler('endPointId')}
                onChecked={propsChangedHandler('Provider.LLM')}
                value={data.endPointId}
                placeHolder="Please select the model you prefer"
              />
            </TitleCard>
          ) : null}
          {!isRealTimeCallMode() ? (
            <TitleCard title="ASR">
              <CheckBoxSelector
                label="ASR Vendor"
                data={formatAsrOptions(
                  expandByteplusAsrProviders(ASR_PROVIDER_OPTIONS.map((o) => o.value))
                )}
                onChange={(v) => {
                  if (v === BYTEPLUS_ASR_V1 || v === BYTEPLUS_ASR_V2) {
                    setData((p) => ({
                      ...p,
                      'Provider.ASR': Provider.Byteplus,
                      SeedAsrVersion: seedAsrVersionFromKey(v),
                    }));
                  } else {
                    propsChangedHandler('Provider.ASR')(v);
                  }
                }}
                value={
                  data['Provider.ASR'] === Provider.Byteplus
                    ? byteplusAsrKeyFromVersion(data.SeedAsrVersion || '2.0')
                    : data['Provider.ASR']
                }
                moreProps={{
                  icon: <IconSwap style={{ fontSize: '12px' }} />,
                  text: 'Switch',
                }}
                placeHolder="Please select the vendor you need"
              />
            </TitleCard>
          ) : null}
          <TitleCard title="Avatar Role">
            <CheckBoxSelector
              label="Avatar Role"
              data={formatAvatarTypeOptions(isRealTimeCallMode() ? RealtimeAvatarMap : AvatarMap)}
              onChange={propsChangedHandler('avatar')}
              onChecked={propsChangedHandler('Provider.Avatar')}
              checked={data['Provider.Avatar']}
              value={data.avatar}
              moreProps={{
                icon: <IconSwap style={{ fontSize: '12px' }} />,
                text: 'Switch',
              }}
              placeHolder="Please select the vendor you need"
            />
          </TitleCard>
        </div>
      </Drawer>
    </>
  );
}

export default AISettings;
