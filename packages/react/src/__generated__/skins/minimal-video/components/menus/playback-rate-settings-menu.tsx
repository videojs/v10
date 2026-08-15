import { Menu } from '@/ui/menu';
import { PlaybackRateRadioGroup } from '@/ui/playback-rate-radio-group';
import { speedText } from '@videojs/core/i18n/text/menu';
import { CheckIcon, SpeedIcon } from '@/icons/minimal';
import { MenuChevron } from './menu-chevron';
import { useTranslator } from '@/i18n';
import { usePlaybackRateOptions } from '@/ui/playback-rate/use-playback-rate-options';

export function PlaybackRateSettingsMenu() {
  const playbackRate = usePlaybackRateOptions();
  const t = useTranslator();
  const hasPlaybackRate = playbackRate?.state.availability === 'available';
  return (
    hasPlaybackRate && (
      <Menu.Root>
        <Menu.Trigger className="media-item-base media-item">
          <SpeedIcon className="media-icon" />
          <span>{t(speedText)}</span>
          <span className="media-hint">
            <span className="media-hint-label">{playbackRate?.selectedLabel}</span>
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className="media-submenu-panel">
          <Menu.Item className="media-item-base media-back">
            <MenuChevron flipped />
            <span>{t(speedText)}</span>
          </Menu.Item>
          <Menu.Separator className="media-separator" />
          <PlaybackRateRadioGroup
            className="media-group"
            renderItem={(props, item) => (
              <Menu.RadioItem {...props} className="media-item-base media-item">
                <span>{item.label}</span>
                <Menu.ItemIndicator forceMount className="media-indicator" checked={item.checked}>
                  <CheckIcon className="media-icon" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            )}
          ></PlaybackRateRadioGroup>
        </Menu.Content>
      </Menu.Root>
    )
  );
}
