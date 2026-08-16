import { useTranslator, useQualityOptions } from '@videojs/react';
import { qualityText } from '@videojs/core/i18n/text/menu';
import { SwitchesIcon } from '@videojs/react/icons';
import { QualityRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';
import type { SubmenuProps } from './submenu';

export interface QualityMenuProps extends Omit<SubmenuProps, 'children' | 'icon' | 'label' | 'selectedLabel'> {}

export function QualityMenu({ ...props }: QualityMenuProps = {}) {
  const quality = useQualityOptions();
  const t = useTranslator();
  const hasQuality = quality?.state.availability === 'available';
  return (
    hasQuality && (
      <Submenu
        {...props}
        icon={
          <SwitchesIcon className="size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100" />
        }
        label={<span>{t(qualityText)}</span>}
        selectedLabel={
          <span className="max-w-24 overflow-hidden text-ellipsis whitespace-nowrap">{quality?.selectedLabel}</span>
        }
      >
        <QualityRadioGroup
          renderItem={(props, item) => (
            <RadioItem {...props} checked={item.checked}>
              <span>
                <span>{item.label}</span>
                {item.tier ? (
                  <sup className="pl-0.5 text-[0.7em] font-semibold leading-none opacity-70">{item.tier}</sup>
                ) : null}
              </span>
              {item.badge ? (
                <span className="rounded-media-pill bg-media-control-hover px-1.5 text-[0.7em] font-semibold">
                  {item.badge}
                </span>
              ) : null}
            </RadioItem>
          )}
        />
      </Submenu>
    )
  );
}
