import { Menu, Tooltip as TooltipPrimitive, useTranslator } from '@videojs/react';
import { settingsText } from '@videojs/core/i18n/text/menu';
import { GearIcon } from '@videojs/react/icons';
import type { ReactNode } from 'react';

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
            <Menu.Trigger className="grid size-media-control shrink-0 place-items-center rounded-media-pill border-0 bg-transparent p-0 text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 group/settings">
              <GearIcon className="size-media-icon drop-shadow-media-icon group-aria-expanded/settings:rotate-90" />
              <span className="sr-only">{t(settingsText)}</span>
            </Menu.Trigger>
          }
        />
        <TooltipPrimitive.Popup className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface m-0 whitespace-nowrap rounded-media-pill border-0 px-2.5 py-[0.35rem] data-open:flex data-open:items-center data-open:gap-1">
          <span>{t(settingsText)}</span>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Root>
      <Menu.Content className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface m-0 min-w-48 max-w-(--media-popover-available-width) overflow-hidden rounded-media-surface border-0 p-1 h-(--media-menu-height) w-(--media-menu-width) [&[data-submenu-expanded=true]>:not([data-submenu])]:-translate-x-full">
        <Menu.Group className="relative flex flex-col gap-0.5">{children}</Menu.Group>
      </Menu.Content>
    </Menu.Root>
  );
}
