/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { Button, Drawer, Input } from '@arco-design/web-react';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import isEqual from 'lodash/isEqual';
import { IconSwap } from '@arco-design/web-react/icon';
import aigcConfig, { ArkVoiceDescription, VendorSVG } from '@/config';
import { Provider } from '@/config/basic';
import RtcClient from '@/lib/RtcClient';
import { clearHistoryMsg, updateAIConfig } from '@/store/slices/room';
import { RootState } from '@/store';
import AnchorTitle from '../AnchorTitle';
import { ConfigFactory } from '@/config/config';
import CheckBoxSelector from '../CheckBoxSelector';
import TitleCard from '../TitleCard';
import utils from '@/utils/utils';
import { isRealTimeCallMode } from '@/app/base';
import { AMAZON_VOICE_TYPE, BYTE_PLUS_VOICE_TYPE, OPENAI_VOICE_TYPE } from '@/config/voiceChat/tts';
import { ModelMap } from '@/config/voiceChat/llm';
import { AvatarMap } from '@/config/voiceChat/avatar';
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
          description: ArkVoiceDescription[voices![option] as BYTE_PLUS_VOICE_TYPE] || '',
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
  });

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Partial<ConfigFactory>>(getSettings());
  const infos = useMemo(() => {
    const allVoices = {
      ...OPENAI_VOICE_TYPE,
      ...BYTE_PLUS_VOICE_TYPE,
      ...AMAZON_VOICE_TYPE,
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
        ]
      : [
          `TTS ${Object.keys(allVoices).find(
            (key) => allVoices[key as keyof typeof allVoices] === room.aiConfig.voice
          )}`,
          `LLM ${Object.keys(allModels).find(
            (key) =>
              allModels[key as keyof typeof allModels].endPointId === room.aiConfig.endPointId
          )}`,
          `ASR ${utils.capitalizeFirstLetter(room.aiConfig['Provider.ASR'])}`,
          room.aiConfig['Provider.Avatar'] !== Provider.None
            ? `Avatar ${`${utils.capitalizeFirstLetter(room.aiConfig.avatar).substring(0, 12)}...`}`
            : void 0,
        ].filter(Boolean);
  }, [
    room.aiConfig.voice,
    room.aiConfig.endPointId,
    room.aiConfig['Provider.ASR'],
    room.aiConfig['Provider.Avatar'],
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
      dispatch(updateAIConfig(data));
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
                      [Provider.Byteplus]: BYTE_PLUS_VOICE_TYPE,
                      [Provider.OpenAI]: OPENAI_VOICE_TYPE,
                      [Provider.Amazon]: AMAZON_VOICE_TYPE,
                    }
              )}
              moreProps={{
                icon: <IconSwap style={{ fontSize: '12px' }} />,
                text: 'Switch',
              }}
              checked={data['Provider.TTS']}
              onChange={propsChangedHandler('voice')}
              onChecked={propsChangedHandler('Provider.TTS')}
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
                // no goole yet: Provider.Google
                data={formatOptions([Provider.Byteplus, Provider.Amazon])}
                onChange={propsChangedHandler('Provider.ASR')}
                value={data['Provider.ASR']}
                moreProps={{
                  icon: <IconSwap style={{ fontSize: '12px' }} />,
                  text: 'Switch',
                }}
                placeHolder="Please select the vendor you need"
              />
            </TitleCard>
          ) : null}
          {!isRealTimeCallMode() ? (
            <TitleCard title="Avatar Role">
              <CheckBoxSelector
                label="Avatar Role"
                data={formatAvatarTypeOptions(AvatarMap)}
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
          ) : null}
        </div>
      </Drawer>
    </>
  );
}

export default AISettings;
