import { CaptionsRadioGroup } from '@/ui/captions-radio-group';
import { Menu } from '@/ui/menu';
import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon, CheckIcon } from '@/icons/minimal';
import { MenuChevron } from './menu-chevron';
import { useTranslator } from '@/i18n';
import { useCaptionsOptions } from '@/ui/captions-radio-group/use-captions-options';

export function CaptionsSettingsMenu() {
  const captions = useCaptionsOptions();
  const t = useTranslator();
  const hasCaptions = captions?.state.availability === 'available';
  return (
    hasCaptions && (
      <Menu.Root>
        <Menu.Trigger className="media-item-base media-item">
          <CaptionsOffIcon className="media-icon" />
          <span>{t(captionsText)}</span>
          <span className="media-hint">
            <span className="media-hint-label">{captions?.selectedLabel}</span>
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className="media-submenu-panel">
          <Menu.Item className="media-item-base media-back">
            <MenuChevron flipped />
            <span>{t(captionsText)}</span>
          </Menu.Item>
          <Menu.Separator className="media-separator" />
          <CaptionsRadioGroup
            className="media-group"
            renderItem={(props, item) => (
              <Menu.RadioItem {...props} className="media-item-base media-item">
                <span>{item.label}</span>
                <Menu.ItemIndicator forceMount className="media-indicator" checked={item.checked}>
                  <CheckIcon className="media-icon" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            )}
          ></CaptionsRadioGroup>
        </Menu.Content>
      </Menu.Root>
    )
  );
}
