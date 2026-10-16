/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Button, Drawer, Input, Message, Radio, Tag } from '@arco-design/web-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import isEqual from 'lodash/isEqual';
import { IconSwap } from '@arco-design/web-react/icon';
import { ArkVoiceDescription, ArkTts2VoiceDescription, VendorSVG } from '@/config';
import { ASR_PROVIDER_OPTIONS, Provider } from '@/config/basic';
import RtcClient from '@/lib/RtcClient';
import { clearHistoryMsg, updateAIConfig, updateScene } from '@/store/slices/room';
import { RootState } from '@/store';
import CheckIcon from '../CheckIcon';
import {
  SCENE,
  SCENES,
  LANGUAGE_SCENES,
  Icon,
  Name,
  SCENE_TAG,
  getSceneSettings,
} from '@/config/scene';
import { getSettings, getConfigSnapshot } from '@/config/settings';
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

  const [scene, setScene] = useState(room.scene);
  const [sceneMode, setSceneMode] = useState(LANGUAGE_SCENES.includes(room.scene) ? 1 : 0);
  const [focusInput, setFocusInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Partial<ConfigFactory>>(getSettings());
  const infos = (() => {
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
          `TTS ${
            Object.keys(allVoices).find(
              (key) => allVoices[key as keyof typeof allVoices] === room.aiConfig.voice
            ) ||
            room.aiConfig.voice ||
            'Custom'
          }`,
          `Model ${
            room.aiConfig.endPointId === 'Your model ID'
              ? 'Configured by server'
              : Object.keys(allModels).find(
                  (key) =>
                    allModels[key as keyof typeof allModels].endPointId === room.aiConfig.endPointId
                ) ||
                room.aiConfig.endPointId ||
                'Custom'
          }`,
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
  })();

  const handleScene = (next: SCENE) => {
    setScene(next);
    setData((prev) => ({ ...prev, ...getSceneSettings(next) }));
  };

  const handleClick = () => {
    setOpen(true);
  };

  const propsChangedHandler =
    (key: string, decorator?: (...args: any[]) => any) => (value: string) => {
      setData((prev) => ({
        ...prev,
        [key]: decorator ? decorator(value) : value,
      }));
    };

  const handleUpdateConfig = async () => {
    setLoading(true);
    const previous = getConfigSnapshot();
    const previousScene = room.scene;
    try {
      if (!isEqual(data, getSettings())) {
        const payload: Partial<ConfigFactory> = { ...data };
        if (
          !isLlmProviderAllowedForWebSearch(
            payload['Provider.LLM'] || room.aiConfig['Provider.LLM']
          )
        ) {
          payload.LLMWebSearchEnabled = false;
        }
        dispatch(updateAIConfig(payload));
        await RtcClient.updateAgent();
        dispatch(clearHistoryMsg());
      }
      dispatch(updateScene(scene));
      setOpen(false);
    } catch (error) {
      dispatch(updateAIConfig(previous));
      dispatch(updateScene(previousScene));
      Message.error((error as Error).message || 'Unable to apply AI configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setData(getSettings());
      setScene(room.scene);
      setSceneMode(LANGUAGE_SCENES.includes(room.scene) ? 1 : 0);
    }
  }, [open, room.scene]);

  return (
    <>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.title}>AI Character</div>
        </div>
        <div className={styles.infos}>
          {infos.map((info) => (
            <div key={info} className={styles.info}>
              {info}
            </div>
          ))}
        </div>
        <Button className={styles.button} onClick={handleClick}>
          <span className={styles['button-text']}>Configure</span>
        </Button>
      </div>
      <Drawer
        width={utils.isMobile() ? '100%' : Math.min(1180, window.innerWidth - 32)}
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
            <div className={styles.suffix}>Apply changes to restart the current conversation.</div>
            <Button loading={loading} className={styles.cancel} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={loading} className={styles.confirm} onClick={handleUpdateConfig}>
              Apply
            </Button>
          </div>
        }
        visible={open}
        onCancel={() => setOpen(false)}
      >
        <div className={styles.title}>
          Choose Your <span className={styles['special-text']}>AI Character</span> for
          <Tag color="arcoblue">{isRealTimeCallMode() ? 'End-to-end' : 'Cascading solution'}</Tag>
        </div>
        {!isRealTimeCallMode() && (
          <Radio.Group
            type="button"
            value={sceneMode}
            className={styles['scene-radio-group']}
            options={[
              { label: 'Chinese / English', value: 0 },
              { label: 'Other Languages / Dialects', value: 1 },
            ]}
            onChange={(mode) => {
              setSceneMode(mode);
              handleScene(mode ? LANGUAGE_SCENES[0] : SCENE.TEACHING_ASSISTANT);
            }}
          />
        )}
        <div className={styles.content}>
          {!isRealTimeCallMode() && (
            <div className={styles['scene-list-wrapper']}>
              <div className={styles.scenes}>
                {(sceneMode ? LANGUAGE_SCENES : [...SCENES, SCENE.CUSTOM]).map((key) => (
                  <CheckIcon
                    mode="horizontal"
                    key={key}
                    title={Name[key]}
                    icon={Icon[key]}
                    tag={SCENE_TAG[key]}
                    checked={scene === key}
                    onClick={() => handleScene(key)}
                  />
                ))}
              </div>
            </div>
          )}
          <div className={styles.configuration}>
            <TitleCard title="TTS" size="mini">
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
                  icon: <IconSwap style={{ fontSize: '16px' }} />,
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
              <TitleCard title="LLM" size="mini">
                <CheckBoxSelector
                  label="LLM Models"
                  data={formatModelTypeOptions({
                    ...ModelMap,
                    [Provider.Byteplus]: {
                      ModelArk: {
                        endPointId:
                          data['Provider.LLM'] === Provider.Byteplus
                            ? data.endPointId || 'Your model ID'
                            : 'Your model ID',
                        description: 'Configured by server',
                      },
                    },
                  })}
                  moreProps={{
                    icon: <IconSwap style={{ fontSize: '16px' }} />,
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
              <TitleCard title="ASR" size="mini">
                <CheckBoxSelector
                  label="ASR Vendor"
                  data={Object.fromEntries(
                    formatAsrOptions(
                      expandByteplusAsrProviders(
                        ASR_PROVIDER_OPTIONS.filter(
                          (o) => !sceneMode || o.value !== Provider.Byteplus
                        ).map((o) => o.value)
                      )
                    ).map((option) => [option.value, [option]])
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
                  checked={
                    data['Provider.ASR'] === Provider.Byteplus
                      ? byteplusAsrKeyFromVersion(data.SeedAsrVersion || '2.0')
                      : data['Provider.ASR']
                  }
                  value={
                    data['Provider.ASR'] === Provider.Byteplus
                      ? byteplusAsrKeyFromVersion(data.SeedAsrVersion || '2.0')
                      : data['Provider.ASR']
                  }
                  moreProps={{
                    icon: <IconSwap style={{ fontSize: '16px' }} />,
                  }}
                  placeHolder="Please select the vendor you need"
                />
              </TitleCard>
            ) : null}
            <TitleCard title="Avatar Role" size="mini">
              <CheckBoxSelector
                label="Avatar Role"
                data={formatAvatarTypeOptions(isRealTimeCallMode() ? RealtimeAvatarMap : AvatarMap)}
                onChange={propsChangedHandler('avatar')}
                onChecked={propsChangedHandler('Provider.Avatar')}
                checked={data['Provider.Avatar']}
                value={data.avatar}
                moreProps={{
                  icon: <IconSwap style={{ fontSize: '16px' }} />,
                }}
                placeHolder="Please select the vendor you need"
              />
            </TitleCard>
            {!isRealTimeCallMode() && (
              <TitleCard
                title={
                  data['Provider.LLM'] === Provider.Byteplus ? 'Model endpoint ID' : 'Model name'
                }
              >
                <Input
                  readOnly={data['Provider.LLM'] === Provider.Byteplus}
                  value={data.endPointId === 'Your model ID' ? '' : data.endPointId}
                  placeholder="Configured by server"
                  onChange={propsChangedHandler('endPointId')}
                />
              </TitleCard>
            )}
            {!isRealTimeCallMode() &&
              (data['Provider.ASR'] === Provider.GoogleAsrV1 ||
                data['Provider.ASR'] === Provider.GoogleAsrV2 ||
                data['Provider.ASR'] === Provider.Amazon) && (
                <TitleCard title="Recognition language">
                  <Input
                    value={data.AsrLanguage}
                    onChange={propsChangedHandler('AsrLanguage')}
                    placeholder="en-US"
                  />
                </TitleCard>
              )}
            <TitleCard
              title="Prompt"
              className={`${styles.prompt} ${focusInput === 'prompt' ? styles.focus : ''}`}
              titleClassName={focusInput === 'prompt' ? styles['focus-title'] : ''}
            >
              <Input.TextArea
                onFocus={() => setFocusInput('prompt')}
                onBlur={() => setFocusInput('')}
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="prompt"
                value={data.SystemMessages?.[0]}
                onChange={propsChangedHandler('SystemMessages', (val) => [val])}
              />
            </TitleCard>
            <TitleCard
              title="Welcome speech"
              className={`${styles.welcomeSpeech} ${focusInput === 'welcome' ? styles.focus : ''}`}
              titleClassName={focusInput === 'welcome' ? styles['focus-title'] : ''}
            >
              <Input.TextArea
                onFocus={() => setFocusInput('welcome')}
                onBlur={() => setFocusInput('')}
                autoSize={{ minRows: 2, maxRows: 3 }}
                placeholder="welcome speech"
                value={data.WelcomeMessage}
                onChange={propsChangedHandler('WelcomeMessage')}
              />
            </TitleCard>
          </div>
        </div>
      </Drawer>
    </>
  );
}

export default AISettings;
