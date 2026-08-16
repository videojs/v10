import { useTranslator, useAudioTrackOptions } from '@videojs/react';
import { audioText } from '@videojs/core/i18n/text/menu';
import { SpeechIcon } from '@videojs/react/icons';
import { AudioTrackRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';
import type { SubmenuProps } from './submenu';

export interface AudioTrackMenuProps extends Omit<SubmenuProps, 'children' | 'icon' | 'label' | 'selectedLabel'> {}

export function AudioTrackMenu({ ...props }: AudioTrackMenuProps = {}) {
  const audioTrack = useAudioTrackOptions();
  const t = useTranslator();
  const hasAudioTrack = audioTrack?.state.availability === 'available';
  return (
    hasAudioTrack && (
      <Submenu
        {...props}
        icon={
          <SpeechIcon className="size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100" />
        }
        label={<span>{t(audioText)}</span>}
        selectedLabel={
          <span className="max-w-24 overflow-hidden text-ellipsis whitespace-nowrap">{audioTrack?.selectedLabel}</span>
        }
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
