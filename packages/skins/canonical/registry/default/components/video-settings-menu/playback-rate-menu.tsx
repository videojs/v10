import { useTranslator, usePlaybackRateOptions } from '@videojs/react';
import { speedText } from '@videojs/core/i18n/text/menu';
import { SpeedIcon } from '@videojs/react/icons';
import { PlaybackRateRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';
import type { SubmenuProps } from './submenu';

export interface PlaybackRateMenuProps extends Omit<SubmenuProps, 'children' | 'icon' | 'label' | 'selectedLabel'> {}

export function PlaybackRateMenu({ ...props }: PlaybackRateMenuProps = {}) {
  const playbackRate = usePlaybackRateOptions();
  const t = useTranslator();
  const hasPlaybackRate = playbackRate?.state.availability === 'available';
  return (
    hasPlaybackRate && (
      <Submenu
        {...props}
        icon={
          <SpeedIcon className="size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100" />
        }
        label={<span>{t(speedText)}</span>}
        selectedLabel={
          <span className="max-w-24 overflow-hidden text-ellipsis whitespace-nowrap">
            {playbackRate?.selectedLabel}
          </span>
        }
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
