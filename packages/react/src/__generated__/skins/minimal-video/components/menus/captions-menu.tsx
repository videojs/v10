import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon } from '@/icons/minimal';
import { CaptionsRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';
import { useTranslator } from '@/i18n';
import { useCaptionsOptions } from '@/ui/captions-radio-group/use-captions-options';

export function CaptionsMenu() {
  const captions = useCaptionsOptions();
  const t = useTranslator();
  const hasCaptions = captions?.state.availability === 'available';
  return (
    hasCaptions && (
      <Submenu
        icon={<CaptionsOffIcon className="media-icon" />}
        label={<span>{t(captionsText)}</span>}
        selectedLabel={<span className="media-hint-label">{captions?.selectedLabel}</span>}
      >
        <CaptionsRadioGroup
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
