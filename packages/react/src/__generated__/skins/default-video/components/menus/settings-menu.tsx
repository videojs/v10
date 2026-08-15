import { Menu } from '@/ui/menu';
import { Tooltip as TooltipPrimitive } from '@/ui/tooltip';
import { settingsText } from '@videojs/core/i18n/text/menu';
import { GearIcon } from '@/icons';
import type { ReactNode } from 'react';
import { useTranslator } from '@/i18n';

export interface SettingsMenuProps {
  children?: ReactNode;
}

export function SettingsMenu({ children }: SettingsMenuProps) {
  const t = useTranslator();
  return (
    <Menu.Root side="top" align="center">
      <TooltipPrimitive.Root side="top">
        <TooltipPrimitive.Trigger
          render={
            <Menu.Trigger className="media-button media-settings-trigger">
              <GearIcon className="media-button-icon media-settings-icon" />
              <span className="media-sr-only">{t(settingsText)}</span>
            </Menu.Trigger>
          }
        />
        <TooltipPrimitive.Popup className="media-surface media-tooltip">
          <span>{t(settingsText)}</span>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Root>
      <Menu.Content className="media-surface media-settings">
        <Menu.Group className="media-group">{children}</Menu.Group>
      </Menu.Content>
    </Menu.Root>
  );
}
