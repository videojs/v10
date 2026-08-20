import { CaptionsRadioGroup, Container, createPlayer, Menu } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import type { ReactNode } from 'react';

const { Player } = createPlayer({ features: videoFeatures });

function CaptionsMenu(): ReactNode {
  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger
        className="cursor-pointer rounded-full border border-white/35 bg-white/75 px-4 py-1.5 text-black backdrop-blur-[10px]"
        render={<button type="button" />}
      >
        Captions
      </Menu.Trigger>
      <Menu.Content className="[--media-menu-side-offset:8px] box-border m-0 grid min-w-45 max-w-[var(--media-menu-available-width,var(--media-popover-available-width,none))] max-h-[var(--media-menu-available-height,var(--media-popover-available-height,none))] gap-0.5 overflow-auto overscroll-none rounded-lg border-0 bg-black/88 p-1.5 text-sm text-white backdrop-blur-[10px]">
        <CaptionsRadioGroup
          className="grid gap-0.5"
          renderItem={(props, item) => (
            <Menu.RadioItem
              {...props}
              className="flex min-h-8 cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 data-highlighted:bg-white/16"
            >
              {item.label}
              <Menu.ItemIndicator checked={item.checked} forceMount className="opacity-0 in-aria-checked:opacity-100">
                ✓
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          )}
        />
      </Menu.Content>
    </Menu.Root>
  );
}

export default function BasicUsage() {
  return (
    <Player>
      <Container className="relative">
        <Video className="w-full" src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop>
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
          <track kind="subtitles" src="/docs/demos/captions-button/captions.vtt" srcLang="es" label="Spanish" />
        </Video>
        <div className="absolute right-2.5 bottom-2.5">
          <CaptionsMenu />
        </div>
      </Container>
    </Player>
  );
}
