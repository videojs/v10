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
            <Menu.Trigger className="grid size-media-control min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-pill border-0 bg-transparent p-0 text-center text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 [transition-property:background-color,color,outline-offset,scale] [transition-duration:150ms] [transition-timing-function:ease-out] hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 not-aria-disabled:active:scale-90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 group/settings">
              <GearIcon className="size-media-icon drop-shadow-media-icon [transition-property:transform] [transition-duration:150ms] [transition-timing-function:ease-in-out] group-aria-expanded/settings:rotate-90 motion-reduce:[transition-duration:0ms]" />
              <span className="sr-only">{t(settingsText)}</span>
            </Menu.Trigger>
          }
        />
        <TooltipPrimitive.Popup className="relative bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:shadow-[inset_0_1px_0_0_var(--media-surface-border)] m-0 overflow-visible border-0 text-inherit [--popup-translate-distance:0.5rem] [transition-property:opacity,filter,transform,scale] [transition-duration:var(--popup-transition-duration)] [transition-timing-function:ease-out] data-starting-style:opacity-0 data-starting-style:[filter:blur(4px)] data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:[filter:blur(4px)] data-ending-style:scale-95 data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left before:pointer-events-auto before:absolute data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full whitespace-nowrap rounded-media-pill px-2.5 py-[0.35rem] data-open:flex data-open:items-center data-open:gap-1 data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset) data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)">
          <span>{t(settingsText)}</span>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Root>
      <Menu.Content className="relative bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:shadow-[inset_0_1px_0_0_var(--media-surface-border)] m-0 overflow-visible border-0 text-inherit [--popup-translate-distance:0.5rem] [transition-property:opacity,filter,transform,scale] [transition-duration:var(--popup-transition-duration)] [transition-timing-function:ease-out] data-starting-style:opacity-0 data-starting-style:[filter:blur(4px)] data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:[filter:blur(4px)] data-ending-style:scale-95 data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left before:pointer-events-auto before:absolute data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset) data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset) min-w-48 max-w-(--media-popover-available-width) overflow-hidden rounded-xl p-1 max-h-[min(var(--media-popover-available-height,14rem),14rem)] overscroll-none h-(--media-menu-height) w-(--media-menu-width) [transition-property:opacity,filter,transform,scale,width,height] [transition-duration:var(--popup-transition-duration),var(--popup-transition-duration),var(--popup-transition-duration),var(--popup-transition-duration),var(--menu-transition-duration),var(--menu-transition-duration)] [--menu-transition-duration:250ms] [&[data-submenu-expanded=true]>:not([data-submenu])]:-translate-x-full [&[data-submenu-expanded=true]>:not([data-submenu])]:[filter:blur(8px)] flex flex-col gap-0.5 [anchor-scope:--menu-item-highlight-anchor]">
        <Menu.Group className="relative flex flex-col gap-0.5 [anchor-scope:--menu-item-highlight-anchor]">
          {children}
        </Menu.Group>
      </Menu.Content>
    </Menu.Root>
  );
}
