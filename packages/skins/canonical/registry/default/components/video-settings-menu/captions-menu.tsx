import { useTranslator, useCaptionsOptions } from '@videojs/react';
import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon } from '@videojs/react/icons';
import { CaptionsRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';
import type { SubmenuProps } from './submenu';

export interface CaptionsMenuProps extends Omit<SubmenuProps, 'children' | 'icon' | 'label' | 'selectedLabel'> {}

export function CaptionsMenu({ ...props }: CaptionsMenuProps = {}) {
  const captions = useCaptionsOptions();
  const t = useTranslator();
  const hasCaptions = captions?.state.availability === 'available';
  return (
    hasCaptions && (
      <Submenu
        {...props}
        icon={
          <CaptionsOffIcon className="size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100" />
        }
        label={<span>{t(captionsText)}</span>}
        selectedLabel={
          <span className="max-w-24 overflow-hidden text-ellipsis whitespace-nowrap">{captions?.selectedLabel}</span>
        }
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
