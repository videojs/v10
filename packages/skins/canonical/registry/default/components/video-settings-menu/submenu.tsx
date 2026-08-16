import { Menu } from '@videojs/react';
import type { ReactNode } from 'react';
import { MenuChevron } from './menu-chevron';
import { cn, resolveClassName } from '@/components/videojs/utils';

export interface SubmenuProps extends Menu.RootProps {
  children?: ReactNode;
  icon: ReactNode;
  label: ReactNode;
  selectedLabel: ReactNode;
  className?: Menu.ContentProps['className'];
}

export function Submenu({ children, icon, label, selectedLabel, className, ...props }: SubmenuProps) {
  return (
    <Menu.Root {...props}>
      <Menu.Trigger
        className={cn(
          'group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-surface px-2 py-1.5 text-left',
          'outline-2 -outline-offset-2 outline-transparent',
          'hover:bg-media-control-hover hover:text-media-accent-text data-highlighted:bg-media-control-hover data-highlighted:text-media-accent-text',
          'focus-visible:outline-media-focus focus-visible:outline-offset-2',
          '[transition-property:color,background-color] [transition-duration:100ms] [transition-timing-function:ease-in-out]',
          'justify-between tabular-nums text-inherit',
          'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
          'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        )}
      >
        {icon}
        {label}
        <span className="ml-auto inline-flex min-w-0 items-center gap-1 pl-2 opacity-70">
          {selectedLabel}
          <MenuChevron />
        </span>
      </Menu.Trigger>
      <Menu.Content
        className={(state) =>
          cn(
            'absolute inset-x-0 top-0 z-10 max-h-[inherit] overflow-auto overscroll-none p-1 outline-none',
            '[transition-property:translate,filter] [transition-duration:var(--media-menu-transition-duration)] [transition-timing-function:ease-out]',
            'data-starting-style:pointer-events-none data-ending-style:pointer-events-none',
            'data-starting-style:translate-x-full data-ending-style:translate-x-full',
            'data-starting-style:[filter:blur(8px)] data-ending-style:[filter:blur(8px)]',
            resolveClassName(className, state),
          )
        }
      >
        <Menu.Item
          className={cn(
            'group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-surface px-2 py-1.5 text-left',
            'outline-2 -outline-offset-2 outline-transparent',
            'hover:bg-media-control-hover hover:text-media-accent-text data-highlighted:bg-media-control-hover data-highlighted:text-media-accent-text',
            'focus-visible:outline-media-focus focus-visible:outline-offset-2',
            '[transition-property:color,background-color] [transition-duration:100ms] [transition-timing-function:ease-in-out]',
            'mb-0.5 w-full',
          )}
        >
          <MenuChevron flipped />
          {label}
        </Menu.Item>
        <Menu.Separator className="my-1 border-b border-media-surface" />
        {children}
      </Menu.Content>
    </Menu.Root>
  );
}
