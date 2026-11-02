import { Input } from '@arco-design/web-react';
import type { AiGatewaySettings, GatewayJsonError, SpeechModule } from '@/config/voiceChat/aiGateway';
import TitleCard from '../TitleCard';
import styles from './index.module.less';

interface Props {
  module: SpeechModule;
  settings: AiGatewaySettings;
  error?: GatewayJsonError;
  onChange: (settings: AiGatewaySettings) => void;
}

export default function AiGatewayFields({ module, settings, error, onChange }: Props) {
  const fields: [keyof AiGatewaySettings, string][] = [];
  if (module === 'TTS')
    fields.push(
      ['Voice', 'Voice'],
      ['OutputAudioPitchRate', 'Pitch (optional)'],
      ['OutputAudioSpeedRate', 'Speed (optional)'],
      ['OutputAudioVolume', 'Volume (optional)']
    );
  fields.push(
    ['ExtraData', 'Extra data (JSON, optional)'],
    ['ExtraHeader', 'Extra headers (JSON, optional)']
  );
  return (
    <TitleCard title={`${module} AI Gateway`}>
      <div className={styles.gatewayFields}>
        {fields.map(([field, label]) => {
          const invalid = error?.module === module && error.field === field;
          const props = {
            id: `gateway-${module}-${field}`,
            'aria-label': `${module} ${label}`,
            value: settings[field] || '',
            autoComplete: 'off',
            onChange: (value: string) => onChange({ ...settings, [field]: value }),
          };
          return (
            <label key={field} htmlFor={props.id}>
              {label}
              {field === 'ExtraData' || field === 'ExtraHeader' ? (
                <Input.TextArea {...props} status={invalid ? 'error' : undefined} aria-invalid={invalid} />
              ) : (
                <Input {...props} />
              )}
              {invalid && <span role="alert">{error.message}</span>}
            </label>
          );
        })}
      </div>
    </TitleCard>
  );
}
