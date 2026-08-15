import { CaptionsRadioGroup, Menu, useTranslator, useCaptionsOptions } from '@videojs/react';
import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon, CheckIcon } from '@videojs/react/icons';
import { MenuChevron } from './menu-chevron';

export function CaptionsSettingsMenu() {
  const captions = useCaptionsOptions();
  const t = useTranslator();
  const hasCaptions = captions?.state.availability === 'available';
  return (
    hasCaptions && (
      <Menu.Root>
        <Menu.Trigger className="group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-surface px-2 py-1.5 text-left outline-2 -outline-offset-2 outline-transparent hover:bg-media-control-hover data-highlighted:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 justify-between tabular-nums text-inherit data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
          <CaptionsOffIcon className="size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100" />
          <span>{t(captionsText)}</span>
          <span className="ml-auto inline-flex min-w-0 items-center gap-1 pl-2 opacity-70">
            <span className="max-w-24 overflow-hidden text-ellipsis whitespace-nowrap">{captions?.selectedLabel}</span>
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className="absolute inset-x-0 top-0 z-10 max-h-[inherit] overflow-auto overscroll-none p-1 outline-none data-starting-style:translate-x-full data-ending-style:translate-x-full">
          <Menu.Item className="group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-surface px-2 py-1.5 text-left outline-2 -outline-offset-2 outline-transparent hover:bg-media-control-hover data-highlighted:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 mb-0.5 w-full">
            <MenuChevron flipped />
            <span>{t(captionsText)}</span>
          </Menu.Item>
          <Menu.Separator className="my-1 border-b border-media-surface" />
          <CaptionsRadioGroup
            className="relative flex flex-col gap-0.5"
            renderItem={(props, item) => (
              <Menu.RadioItem
                {...props}
                className="group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-surface px-2 py-1.5 text-left outline-2 -outline-offset-2 outline-transparent hover:bg-media-control-hover data-highlighted:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 justify-between tabular-nums text-inherit data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
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
