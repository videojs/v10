import { Menu } from '@/ui/menu';
import { QualityRadioGroup } from '@/ui/quality-radio-group';
import { qualityText } from '@videojs/core/i18n/text/menu';
import { CheckIcon, SwitchesIcon } from '@/icons/minimal';
import { MenuChevron } from './menu-chevron';
import { useTranslator } from '@/i18n';
import { useQualityOptions } from '@/ui/quality/use-quality-options';

export function QualitySettingsMenu() {
  const quality = useQualityOptions();
  const t = useTranslator();
  const hasQuality = quality?.state.availability === 'available';
  return (
    hasQuality && (
      <Menu.Root>
        <Menu.Trigger className="media-item-base media-item">
          <SwitchesIcon className="media-icon" />
          <span>{t(qualityText)}</span>
          <span className="media-hint">
            <span className="media-hint-label">{quality?.selectedLabel}</span>
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className="media-submenu-panel">
          <Menu.Item className="media-item-base media-back">
            <MenuChevron flipped />
            <span>{t(qualityText)}</span>
          </Menu.Item>
          <Menu.Separator className="media-separator" />
          <QualityRadioGroup
            className="media-group"
            renderItem={(props, item) => (
              <Menu.RadioItem {...props} className="media-item-base media-item">
                <span>
                  <span>{item.label}</span>
                  {item.tier ? <sup className="media-tier">{item.tier}</sup> : null}
                </span>
                {item.badge ? <span className="media-badge">{item.badge}</span> : null}
                <Menu.ItemIndicator forceMount className="media-indicator" checked={item.checked}>
                  <CheckIcon className="media-icon" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            )}
          ></QualityRadioGroup>
        </Menu.Content>
      </Menu.Root>
    )
  );
}
