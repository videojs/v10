import { AudioTrackRadioGroup } from '@/ui/audio-track-radio-group';
import { Menu } from '@/ui/menu';
import { audioText } from '@videojs/core/i18n/text/menu';
import { CheckIcon, SpeechIcon } from '@/icons';
import { MenuChevron } from './menu-chevron';
import { useTranslator } from '@/i18n';
import { useAudioTrackOptions } from '@/ui/audio-track/use-audio-track-options';

export function AudioTrackSettingsMenu() {
  const audioTrack = useAudioTrackOptions();
  const t = useTranslator();
  const hasAudioTrack = audioTrack?.state.availability === 'available';
  return (
    hasAudioTrack && (
      <Menu.Root>
        <Menu.Trigger className="media-item-base media-item">
          <SpeechIcon className="media-icon" />
          <span>{t(audioText)}</span>
          <span className="media-hint">
            <span className="media-hint-label">{audioTrack?.selectedLabel}</span>
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className="media-submenu-panel">
          <Menu.Item className="media-item-base media-back">
            <MenuChevron flipped />
            <span>{t(audioText)}</span>
          </Menu.Item>
          <Menu.Separator className="media-separator" />
          <AudioTrackRadioGroup
            className="media-group"
            renderItem={(props, item) => (
              <Menu.RadioItem {...props} className="media-item-base media-item">
                <span>{item.label}</span>
                <Menu.ItemIndicator forceMount className="media-indicator" checked={item.checked}>
                  <CheckIcon className="media-icon" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            )}
          ></AudioTrackRadioGroup>
        </Menu.Content>
      </Menu.Root>
    )
  );
}
