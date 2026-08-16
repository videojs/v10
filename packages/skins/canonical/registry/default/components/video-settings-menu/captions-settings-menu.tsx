import { CaptionsRadioGroup, Menu, useTranslator, useCaptionsOptions } from '@videojs/react';
import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon, CheckIcon } from '@videojs/react/icons';
import { MenuChevron } from './menu-chevron';
import { cn } from '@/components/videojs/utils';

export interface CaptionsSettingsMenuProps extends Menu.RootProps {}

export function CaptionsSettingsMenu({ ...props }: CaptionsSettingsMenuProps = {}) {
  const captions = useCaptionsOptions();
  const t = useTranslator();
  const hasCaptions = captions?.state.availability === 'available';
  return (
    hasCaptions && (
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
          <CaptionsOffIcon className="size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100" />
          <span>{t(captionsText)}</span>
          <span className="ml-auto inline-flex min-w-0 items-center gap-1 pl-2 opacity-70">
            <span className="max-w-24 overflow-hidden text-ellipsis whitespace-nowrap">{captions?.selectedLabel}</span>
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content
          className={cn(
            'absolute inset-x-0 top-0 z-10 max-h-[inherit] overflow-auto overscroll-none p-1 outline-none',
            '[transition-property:translate,filter] [transition-duration:var(--media-menu-transition-duration)] [transition-timing-function:ease-out]',
            'data-starting-style:pointer-events-none data-ending-style:pointer-events-none',
            'data-starting-style:translate-x-full data-ending-style:translate-x-full',
            'data-starting-style:[filter:blur(8px)] data-ending-style:[filter:blur(8px)]',
          )}
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
            <span>{t(captionsText)}</span>
          </Menu.Item>
          <Menu.Separator className="my-1 border-b border-media-surface" />
          <CaptionsRadioGroup
            className="relative flex flex-col gap-0.5 [anchor-scope:--media-menu-item-highlight-anchor]"
            renderItem={(props, item) => (
              <Menu.RadioItem
                {...props}
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
                <span>{item.label}</span>
                <Menu.ItemIndicator
                  forceMount
                  className="ml-auto -mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100"
                  checked={item.checked}
                >
                  <CheckIcon className="size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            )}
          ></CaptionsRadioGroup>
        </Menu.Content>
      </Menu.Root>
    )
  );
}
