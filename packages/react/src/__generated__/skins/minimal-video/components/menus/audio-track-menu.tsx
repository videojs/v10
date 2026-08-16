import { audioText } from '@videojs/core/i18n/text/menu';
import { SpeechIcon } from '@/icons/minimal';
import { AudioTrackRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';
import { useTranslator } from '@/i18n';
import { useAudioTrackOptions } from '@/ui/audio-track/use-audio-track-options';

export function AudioTrackMenu() {
  const audioTrack = useAudioTrackOptions();
  const t = useTranslator();
  const hasAudioTrack = audioTrack?.state.availability === 'available';
  return (
    hasAudioTrack && (
      <Submenu
        icon={<SpeechIcon className="media-icon" />}
        label={<span>{t(audioText)}</span>}
        selectedLabel={<span className="media-hint-label">{audioTrack?.selectedLabel}</span>}
      >
        <AudioTrackRadioGroup
          renderItem={(props, item) => (
            <RadioItem {...props} checked={item.checked}>
              <span>{item.label}</span>
            </RadioItem>
          )}
        />
      </Submenu>
    )
  );
}
