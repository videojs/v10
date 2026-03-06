import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import clsx from 'clsx';
import type { ReactElement, ReactNode } from 'react';

export interface TooltipProviderProps {
  children: ReactNode;
  delay?: number;
  closeDelay?: number;
}

export function TooltipProvider({ children, delay = 600, closeDelay = 0 }: TooltipProviderProps) {
  return (
    <BaseTooltip.Provider delay={delay} closeDelay={closeDelay}>
      {children}
    </BaseTooltip.Provider>
  );
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  className?: string;
}

export function Tooltip({ content, children, side = 'top', sideOffset = 5, className }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger>{children}</BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={sideOffset}>
          <BaseTooltip.Popup
            className={clsx(
              'bg-manila-50 dark:bg-soot text-p3 px-3 py-2 rounded-xs border border-manila-75 dark:border-warm-gray',
              'z-50 max-w-xs',
              className
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
