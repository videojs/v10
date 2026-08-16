import { speedText } from '@videojs/core/i18n/text/menu';
import { SpeedIcon } from '@/icons';
import { PlaybackRateRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';
import { useTranslator } from '@/i18n';
import { usePlaybackRateOptions } from '@/ui/playback-rate/use-playback-rate-options';

export function PlaybackRateMenu() {
  const playbackRate = usePlaybackRateOptions();
  const t = useTranslator();
  const hasPlaybackRate = playbackRate?.state.availability === 'available';
  return (
    hasPlaybackRate && (
      <Submenu
        icon={<SpeedIcon className="media-icon" />}
        label={<span>{t(speedText)}</span>}
        selectedLabel={<span className="media-hint-label">{playbackRate?.selectedLabel}</span>}
      >
        <PlaybackRateRadioGroup
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
