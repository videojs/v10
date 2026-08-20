import {
  Container,
  createPlayer,
  Menu,
  useAudioTrackOptions,
  useCaptionsOptions,
  usePlaybackRateOptions,
  useQualityOptions,
} from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { videoFeatures } from '@videojs/react/video';
import type { ReactNode } from 'react';

const { Player } = createPlayer({ features: videoFeatures });
const src = '{{VJS10_MULTI_AUDIO_DEMO_VIDEO_HLS}}';

function SettingsMenu(): ReactNode {
  const playbackRate = usePlaybackRateOptions();
  const quality = useQualityOptions();
  const audioTrack = useAudioTrackOptions();
  const captions = useCaptionsOptions();
  const hasPlaybackRate = playbackRate?.state.availability === 'available';
  const hasQuality = quality?.state.availability === 'available';
  const hasAudioTrack = audioTrack?.state.availability === 'available';
  const hasCaptions = captions?.state.availability === 'available';

  if (!hasPlaybackRate && !hasQuality && !hasAudioTrack && !hasCaptions) return null;

  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger
        className="cursor-pointer rounded-full border border-white/35 bg-white/75 px-4 py-1.5 text-black backdrop-blur-[10px]"
        aria-label="Settings"
        render={<button type="button" />}
      >
        Settings
      </Menu.Trigger>
      <Menu.Content className="relative m-0 box-border h-(--media-menu-height) max-h-[var(--media-menu-available-height,var(--media-popover-available-height,none))] w-(--media-menu-width) max-w-[var(--media-menu-available-width,var(--media-popover-available-width,none))] min-w-45 overflow-hidden overscroll-none rounded-lg border-0 bg-black/88 p-1.5 text-sm text-white backdrop-blur-[10px] transition-[width,height,opacity,filter] duration-[220ms] ease-in-out [--media-menu-side-offset:8px]">
        <div className="absolute inset-0 grid translate-x-0 gap-0.5 overflow-auto overscroll-none p-1.5 outline-none transition-[translate,filter] duration-[220ms] ease-in-out will-change-[translate] in-data-[submenu-expanded=true]:-translate-x-full in-data-[submenu-expanded=true]:blur-sm">
          {hasQuality ? (
            <Menu.Root>
              <Menu.Trigger
                className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
                render={(props) => (
                  <div {...props}>
                    <span>Quality</span>
                    <span className="inline-flex items-center gap-2 text-white/72">
                      {quality.selectedLabel}
                      <span aria-hidden="true" className="text-lg leading-none text-white/72">
                        ›
                      </span>
                    </span>
                  </div>
                )}
              />
              <Menu.Content className="absolute inset-0 z-1 grid translate-x-0 gap-0.5 overflow-auto overscroll-none p-1.5 outline-none transition-[translate,filter] duration-[220ms] ease-in-out will-change-[translate] data-starting-style:overflow-hidden data-starting-style:pointer-events-none data-starting-style:blur-sm data-starting-style:translate-x-full data-ending-style:overflow-hidden data-ending-style:pointer-events-none data-ending-style:blur-sm data-ending-style:translate-x-full">
                <Menu.Item className="flex min-h-8 cursor-pointer items-center justify-start gap-2 rounded-md px-2.5 hover:bg-white/16">
                  <span aria-hidden="true" className="text-lg leading-none text-white/72">
                    ‹
                  </span>
                  Quality
                </Menu.Item>
                <Menu.RadioGroup
                  className="grid gap-0.5"
                  value={quality.value}
                  onValueChange={quality.setValue}
                  aria-label="Quality"
                >
                  {quality.options.map((option) => (
                    <Menu.RadioItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
                    >
                      <span>
                        {option.label}
                        {option.tier ? <sup className="ml-0.5 text-[10px]">{option.tier}</sup> : null}
                      </span>
                      {option.badge ? <span className="ml-auto text-white/72">{option.badge}</span> : null}
                      <Menu.ItemIndicator
                        checked={option.value === quality.value}
                        forceMount
                        className="text-lg leading-none text-white/72 opacity-0 in-aria-checked:opacity-100"
                      >
                        ✓
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Root>
          ) : null}

          {hasAudioTrack ? (
            <Menu.Root>
              <Menu.Trigger
                className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
                render={(props) => (
                  <div {...props}>
                    <span>Audio</span>
                    <span className="inline-flex items-center gap-2 text-white/72">
                      {audioTrack.selectedLabel}
                      <span aria-hidden="true" className="text-lg leading-none text-white/72">
                        ›
                      </span>
                    </span>
                  </div>
                )}
              />
              <Menu.Content className="absolute inset-0 z-1 grid translate-x-0 gap-0.5 overflow-auto overscroll-none p-1.5 outline-none transition-[translate,filter] duration-[220ms] ease-in-out will-change-[translate] data-starting-style:overflow-hidden data-starting-style:pointer-events-none data-starting-style:blur-sm data-starting-style:translate-x-full data-ending-style:overflow-hidden data-ending-style:pointer-events-none data-ending-style:blur-sm data-ending-style:translate-x-full">
                <Menu.Item className="flex min-h-8 cursor-pointer items-center justify-start gap-2 rounded-md px-2.5 hover:bg-white/16">
                  <span aria-hidden="true" className="text-lg leading-none text-white/72">
                    ‹
                  </span>
                  Audio
                </Menu.Item>
                <Menu.RadioGroup
                  className="grid gap-0.5"
                  value={audioTrack.value}
                  onValueChange={audioTrack.setValue}
                  aria-label="Audio tracks"
                >
                  {audioTrack.options.map((option) => (
                    <Menu.RadioItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
                    >
                      <span>{option.label}</span>
                      <Menu.ItemIndicator
                        checked={option.value === audioTrack.value}
                        forceMount
                        className="text-lg leading-none text-white/72 opacity-0 in-aria-checked:opacity-100"
                      >
                        ✓
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Root>
          ) : null}

          {hasPlaybackRate ? (
            <Menu.Root>
              <Menu.Trigger
                className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
                render={(props) => (
                  <div {...props}>
                    <span>Speed</span>
                    <span className="inline-flex items-center gap-2 text-white/72">
                      {playbackRate.selectedLabel}
                      <span aria-hidden="true" className="text-lg leading-none text-white/72">
                        ›
                      </span>
                    </span>
                  </div>
                )}
              />
              <Menu.Content className="absolute inset-0 z-1 grid translate-x-0 gap-0.5 overflow-auto overscroll-none p-1.5 outline-none transition-[translate,filter] duration-[220ms] ease-in-out will-change-[translate] data-starting-style:overflow-hidden data-starting-style:pointer-events-none data-starting-style:blur-sm data-starting-style:translate-x-full data-ending-style:overflow-hidden data-ending-style:pointer-events-none data-ending-style:blur-sm data-ending-style:translate-x-full">
                <Menu.Item className="flex min-h-8 cursor-pointer items-center justify-start gap-2 rounded-md px-2.5 hover:bg-white/16">
                  <span aria-hidden="true" className="text-lg leading-none text-white/72">
                    ‹
                  </span>
                  Speed
                </Menu.Item>
                <Menu.RadioGroup
                  className="grid gap-0.5"
                  value={playbackRate.value}
                  onValueChange={playbackRate.setValue}
                  aria-label="Playback rate"
                >
                  {playbackRate.options.map((option) => (
                    <Menu.RadioItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
                    >
                      <span>{option.label}</span>
                      <Menu.ItemIndicator
                        checked={option.value === playbackRate.value}
                        forceMount
                        className="text-lg leading-none text-white/72 opacity-0 in-aria-checked:opacity-100"
                      >
                        ✓
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Root>
          ) : null}

          {hasCaptions ? (
            <Menu.Root>
              <Menu.Trigger
                className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
                render={(props) => (
                  <div {...props}>
                    <span>Captions</span>
                    <span className="inline-flex items-center gap-2 text-white/72">
                      {captions.selectedLabel}
                      <span aria-hidden="true" className="text-lg leading-none text-white/72">
                        ›
                      </span>
                    </span>
                  </div>
                )}
              />
              <Menu.Content className="absolute inset-0 z-1 grid translate-x-0 gap-0.5 overflow-auto overscroll-none p-1.5 outline-none transition-[translate,filter] duration-[220ms] ease-in-out will-change-[translate] data-starting-style:overflow-hidden data-starting-style:pointer-events-none data-starting-style:blur-sm data-starting-style:translate-x-full data-ending-style:overflow-hidden data-ending-style:pointer-events-none data-ending-style:blur-sm data-ending-style:translate-x-full">
                <Menu.Item className="flex min-h-8 cursor-pointer items-center justify-start gap-2 rounded-md px-2.5 hover:bg-white/16">
                  <span aria-hidden="true" className="text-lg leading-none text-white/72">
                    ‹
                  </span>
                  Captions
                </Menu.Item>
                <Menu.RadioGroup
                  className="grid gap-0.5"
                  value={captions.value}
                  onValueChange={captions.setValue}
                  aria-label="Captions"
                >
                  {captions.options.map((option) => (
                    <Menu.RadioItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
                    >
                      <span>{option.label}</span>
                      <Menu.ItemIndicator
                        checked={option.value === captions.value}
                        forceMount
                        className="text-lg leading-none text-white/72 opacity-0 in-aria-checked:opacity-100"
                      >
                        ✓
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Root>
          ) : null}

          <Menu.Item
            className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 data-highlighted:bg-white/16"
            onSelect={() => navigator.clipboard?.writeText(window.location.href)}
          >
            Copy link
          </Menu.Item>
        </div>
      </Menu.Content>
    </Menu.Root>
  );
}

export default function BasicUsage() {
  return (
    <Player>
      <Container className="relative">
        <HlsJsVideo className="w-full" src={src} autoPlay crossOrigin="anonymous" muted playsInline loop>
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
          <track kind="subtitles" src="/docs/demos/captions-button/captions.vtt" srcLang="es" label="Spanish" />
        </HlsJsVideo>
        <div className="absolute right-2.5 bottom-2.5">
          <SettingsMenu />
        </div>
      </Container>
    </Player>
  );
}
