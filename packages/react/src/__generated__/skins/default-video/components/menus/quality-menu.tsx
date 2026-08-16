import { qualityText } from '@videojs/core/i18n/text/menu';
import { SwitchesIcon } from '@/icons';
import { QualityRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';
import { useTranslator } from '@/i18n';
import { useQualityOptions } from '@/ui/quality/use-quality-options';

export function QualityMenu() {
  const quality = useQualityOptions();
  const t = useTranslator();
  const hasQuality = quality?.state.availability === 'available';
  return (
    hasQuality && (
      <Submenu
        icon={<SwitchesIcon className="media-icon" />}
        label={<span>{t(qualityText)}</span>}
        selectedLabel={<span className="media-hint-label">{quality?.selectedLabel}</span>}
      >
        <QualityRadioGroup
          renderItem={(props, item) => (
            <RadioItem {...props} checked={item.checked}>
              <span>
                <span>{item.label}</span>
                {item.tier ? <sup className="media-tier">{item.tier}</sup> : null}
              </span>
              {item.badge ? <span className="media-badge">{item.badge}</span> : null}
            </RadioItem>
          )}
        />
      </Submenu>
    )
  );
}
