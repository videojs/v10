// SPIKE approach 1 with Radix: Video.js components own behaviour, state, and accessibility; Radix primitives are
// handed in through `render`. Radix has no Button primitive, so plain buttons render into a shadcn-style button built
// on Radix `Slot`, and toggle-shaped ones render into Radix `Toggle` using the *function form* of `render`, which
// receives Video.js state and drives Radix's controlled `pressed`. Feature parity with the default video skin.

import { PlayerBehaviors } from '@app/shared/react/library-skin-harness';
import {
  AirPlayButton,
  BufferingIndicator,
  CaptionsButton,
  CastButton,
  Controls,
  ErrorDialog,
  FullscreenButton,
  type HTMLProps,
  Menu,
  MuteButton,
  PiPButton,
  PlayButton,
  Poster,
  type RenderFunction,
  SeekIndicator,
  Slider,
  StatusAnnouncer,
  StatusIndicator,
  Time,
  TimeSlider,
  Tooltip,
  useAudioTrackOptions,
  useCaptionsOptions,
  usePlaybackRateOptions,
  useQualityOptions,
  VolumeIndicator,
  VolumePopover,
  VolumeSlider,
} from '@videojs/react';
import {
  AirPlayEnterIcon,
  AirPlayExitIcon,
  CaptionsOffIcon,
  CaptionsOnIcon,
  CastEnterIcon,
  CastExitIcon,
  CheckIcon,
  ChevronIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  GearIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
  RestartIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react/icons';
import { AudioTrackRadioGroup } from '@videojs/react/ui/audio-track-radio-group';
import { CaptionsRadioGroup } from '@videojs/react/ui/captions-radio-group';
import { PlaybackRateRadioGroup } from '@videojs/react/ui/playback-rate-radio-group';
import { QualityRadioGroup } from '@videojs/react/ui/quality-radio-group';
import { Slot, Toggle } from 'radix-ui';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

import {
  BAR_CLASS,
  BAR_HIDDEN_CLASS,
  DIALOG_CLASS,
  ICON_BUTTON_CLASS,
  INDICATOR_CLASS,
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  OVERLAY_CLASS,
  POPUP_CLASS,
  ROW_CLASS,
  TEXT_BUTTON_CLASS,
  TOOLTIP_CLASS,
} from './shared';

/** A shadcn-style button on Radix `Slot`. Forwards `ref` and spreads unknown props, which is all `render` needs. */
function IconButton({ asChild, className, ...props }: ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';

  return <Comp className={`${ICON_BUTTON_CLASS} ${className ?? ''}`} {...props} />;
}

function TextButton({ className, ...props }: ComponentProps<'button'>) {
  return <button className={`${TEXT_BUTTON_CLASS} ${className ?? ''}`} {...props} />;
}

/** Video.js tooltip; the Video.js button inside pushes its translated label and shortcut into it. */
function WithTooltip({ children }: { children: ReactElement }) {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger render={children} />
      <Tooltip.Popup className={TOOLTIP_CLASS}>
        <Tooltip.Label />
        <Tooltip.Shortcut className="ml-1 text-neutral-500" />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

/**
 * Function-form `render`: Video.js hands over merged DOM props plus its state; Radix Toggle gets `pressed` from that
 * state and adds `aria-pressed`/`data-state`, while Video.js keeps click handling, `aria-label`, and `data-*`.
 */
function renderToggle<State>(pressed: (state: State) => boolean): RenderFunction<HTMLProps, State> {
  return (props, state) => (
    <Toggle.Root {...props} className={`${ICON_BUTTON_CLASS} ${props.className ?? ''}`} pressed={pressed(state)} />
  );
}

function RadioItem({ children, ...props }: { children: ReactNode } & Menu.RadioItemProps) {
  return (
    <Menu.RadioItem className={MENU_ITEM_CLASS} {...props}>
      <Menu.ItemIndicator className="absolute left-2 flex size-4 items-center justify-center [&_svg]:size-3.5">
        <CheckIcon />
      </Menu.ItemIndicator>
      {children}
    </Menu.RadioItem>
  );
}

/**
 * A labelled group that disappears with its options. The radio-group `Options` part renders nothing when the feature
 * has nothing to offer, but the label is ours, so the same option hook the `Root` uses decides whether to show it.
 */
function OptionsGroup({
  label,
  hidden,
  children,
}: {
  label: string;
  hidden: boolean | undefined;
  children: ReactNode;
}) {
  if (hidden !== false) return null;

  return (
    <Menu.Group>
      <Menu.GroupLabel className={MENU_LABEL_CLASS}>{label}</Menu.GroupLabel>
      {children}
    </Menu.Group>
  );
}

/** Flat settings menu; each radio-group `Root` hides its group when the feature has nothing to offer. */
function SettingsMenu() {
  return (
    <Menu.Root side="top" align="end">
      <QualityRadioGroup.Root>
        <AudioTrackRadioGroup.Root>
          <PlaybackRateRadioGroup.Root>
            <CaptionsRadioGroup.Root>
              <WithTooltip>
                <Menu.Trigger render={<IconButton />} aria-label="Settings">
                  <GearIcon />
                </Menu.Trigger>
              </WithTooltip>
              <Menu.Popup className={`${POPUP_CLASS} max-h-[min(70vh,20rem)] min-w-56 overflow-y-auto`}>
                <Menu.Content className="flex flex-col outline-none">
                  <OptionsGroup label="Quality" hidden={useQualityOptions()?.hidden}>
                    <QualityRadioGroup.Options
                      renderItem={(props, item) => (
                        <RadioItem {...props}>
                          <span>
                            {item.label}
                            {item.tier ? <sup className="ml-0.5 text-[0.65em]">{item.tier}</sup> : null}
                          </span>
                          {item.badge ? <span className="ml-auto text-xs text-white/60">{item.badge}</span> : null}
                        </RadioItem>
                      )}
                    />
                  </OptionsGroup>
                  <OptionsGroup label="Audio" hidden={useAudioTrackOptions()?.hidden}>
                    <AudioTrackRadioGroup.Options
                      renderItem={(props, item) => <RadioItem {...props}>{item.label}</RadioItem>}
                    />
                  </OptionsGroup>
                  <OptionsGroup label="Speed" hidden={usePlaybackRateOptions()?.hidden}>
                    <PlaybackRateRadioGroup.Options
                      renderItem={(props, item) => <RadioItem {...props}>{item.label}</RadioItem>}
                    />
                  </OptionsGroup>
                  <OptionsGroup label="Captions" hidden={useCaptionsOptions()?.hidden}>
                    <CaptionsRadioGroup.Options
                      renderItem={(props, item) => <RadioItem {...props}>{item.label}</RadioItem>}
                    />
                  </OptionsGroup>
                </Menu.Content>
              </Menu.Popup>
            </CaptionsRadioGroup.Root>
          </PlaybackRateRadioGroup.Root>
        </AudioTrackRadioGroup.Root>
      </QualityRadioGroup.Root>
    </Menu.Root>
  );
}

/**
 * Friction: a Radix Slider cannot be rendered into ours (pointer on both roots, two slider roles). Video.js slider
 * stays.
 */
function StyledTimeSlider() {
  return (
    <TimeSlider.Root className="group/slider relative flex h-5 w-full touch-none items-center select-none">
      <TimeSlider.Chapters
        className="flex h-full w-full items-center gap-0.5"
        renderChapter={(props) => (
          <div className="flex h-full grow items-center" {...props}>
            <TimeSlider.Track className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/slider:h-1.5">
              <TimeSlider.Buffer className="absolute inset-y-0 left-0 w-[var(--media-slider-buffer)] bg-white/30" />
              <TimeSlider.Fill className="absolute inset-y-0 left-0 w-[var(--media-slider-fill)] bg-white" />
            </TimeSlider.Track>
          </div>
        )}
      />
      <TimeSlider.Thumb className="absolute left-[var(--media-slider-fill)] block size-3.5 -translate-x-1/2 rounded-full border border-white/40 bg-white opacity-0 shadow transition-opacity group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 data-[dragging]:opacity-100" />
      <TimeSlider.Preview className="bottom-full mb-2 flex flex-col items-center gap-1 opacity-0 transition-opacity data-[pointing]:opacity-100">
        <Slider.Thumbnail.Root className="overflow-hidden rounded-md border border-white/20 bg-black shadow-lg empty:hidden">
          <Slider.Thumbnail.Image className="block" />
        </Slider.Thumbnail.Root>
        <div className="rounded-md bg-white px-2 py-1 text-xs font-medium text-neutral-900 shadow">
          <TimeSlider.ChapterTitle className="mr-1 text-neutral-500 empty:hidden" />
          <TimeSlider.Value type="pointer" />
        </div>
      </TimeSlider.Preview>
    </TimeSlider.Root>
  );
}

function VolumeControl() {
  return (
    <VolumePopover.Root side="top" openOnHover delay={200} closeDelay={100}>
      <WithTooltip>
        <VolumePopover.Trigger
          render={
            <MuteButton render={renderToggle((state) => state.muted)} className="group/mute">
              <VolumeOffIcon className="hidden group-data-[volume-level=off]/mute:block" />
              <VolumeLowIcon className="hidden group-data-[volume-level=low]/mute:block" />
              <VolumeHighIcon className="hidden group-data-[volume-level=high]/mute:block" />
            </MuteButton>
          }
        />
      </WithTooltip>
      <VolumePopover.Popup className={`${POPUP_CLASS} flex h-36 items-center justify-center px-3 py-3`}>
        <VolumeSlider.Root
          orientation="vertical"
          className="relative flex h-full w-5 touch-none items-center justify-center select-none"
        >
          <Slider.Track className="relative h-full w-1 overflow-hidden rounded-full bg-white/25">
            <Slider.Fill className="absolute inset-x-0 bottom-0 h-[var(--media-slider-fill)] bg-white" />
          </Slider.Track>
          <Slider.Thumb className="absolute bottom-[var(--media-slider-fill)] block size-3.5 translate-y-1/2 rounded-full border border-white/40 bg-white shadow focus-visible:ring-2 focus-visible:ring-white/60" />
        </VolumeSlider.Root>
      </VolumePopover.Popup>
    </VolumePopover.Root>
  );
}

function StatusIndicators() {
  return (
    <>
      <StatusAnnouncer />
      <div className={OVERLAY_CLASS}>
        <VolumeIndicator.Root className={INDICATOR_CLASS}>
          <VolumeIndicator.Fill className="group/vi flex items-center gap-2">
            <VolumeHighIcon className="hidden group-data-[level=high]/vi:block" />
            <VolumeLowIcon className="hidden group-data-[level=low]/vi:block" />
            <VolumeOffIcon className="hidden group-data-[level=off]/vi:block" />
            <VolumeIndicator.Value className="text-lg tabular-nums" />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>
        <StatusIndicator.Root
          actions={['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture']}
          className={`${INDICATOR_CLASS} group/si absolute`}
        >
          <CaptionsOnIcon className="hidden group-data-[status=captions-on]/si:block" />
          <CaptionsOffIcon className="hidden group-data-[status=captions-off]/si:block" />
          <FullscreenEnterIcon className="hidden group-data-[status=fullscreen]/si:block" />
          <FullscreenExitIcon className="hidden group-data-[status=exit-fullscreen]/si:block" />
          <PipEnterIcon className="hidden group-data-[status=pip]/si:block" />
          <PipExitIcon className="hidden group-data-[status=exit-pip]/si:block" />
          <StatusIndicator.Value className="sr-only" />
        </StatusIndicator.Root>
        <SeekIndicator.Root className={`${INDICATOR_CLASS} group/seek absolute flex items-center gap-1`}>
          <ChevronIcon className="group-data-[direction=backward]/seek:rotate-180" />
          <SeekIndicator.Value className="text-lg tabular-nums" />
        </SeekIndicator.Root>
        <StatusIndicator.Root actions={['togglePaused']} className={`${INDICATOR_CLASS} group/ps absolute`}>
          <PlayIcon className="hidden group-data-[status=play]/ps:block" />
          <PauseIcon className="hidden group-data-[status=pause]/ps:block" />
        </StatusIndicator.Root>
      </div>
    </>
  );
}

export function RenderApproachControls() {
  return (
    <>
      <Poster.Root className="absolute inset-0 opacity-0 transition-opacity data-[visible]:opacity-100">
        <Poster.Image className="size-full object-cover" />
      </Poster.Root>
      <BufferingIndicator className={`${OVERLAY_CLASS} opacity-0 transition-opacity data-[visible]:opacity-100`}>
        <SpinnerIcon className="size-14 animate-spin" />
      </BufferingIndicator>
      <ErrorDialog.Root>
        <ErrorDialog.Backdrop className="absolute inset-0 bg-black/60" />
        <ErrorDialog.Popup className={DIALOG_CLASS}>
          <ErrorDialog.Title className="text-base font-semibold" />
          <ErrorDialog.Description className="text-sm text-white/80" />
          <div className="flex justify-end">
            <ErrorDialog.Close render={<TextButton />}>Dismiss</ErrorDialog.Close>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>
      <Controls.Root>
        <Controls.Content className={(state) => `${BAR_CLASS} ${state.visible ? '' : BAR_HIDDEN_CLASS}`}>
          <Tooltip.Provider>
            <StyledTimeSlider />
            <div className={ROW_CLASS}>
              <WithTooltip>
                <PlayButton render={<IconButton />} className="group/play">
                  <PlayIcon className="hidden group-data-[ended]/play:hidden group-data-[paused]/play:block" />
                  <PauseIcon className="block group-data-[paused]/play:hidden" />
                  <RestartIcon className="hidden group-data-[ended]/play:block" />
                </PlayButton>
              </WithTooltip>
              <VolumeControl />
              <div className="ml-1 text-sm tabular-nums">
                <Time.Value type="current" />
                <span className="text-white/60"> / </span>
                <Time.Value type="remaining" toggle className="cursor-pointer text-white/60" />
              </div>
              <div className="grow" />
              {/* Each Video.js button renders null while its feature is unsupported or unavailable. */}
              <WithTooltip>
                <CaptionsButton render={renderToggle((state) => state.subtitlesShowing)} className="group/cc">
                  <CaptionsOffIcon className="block group-data-[active]/cc:hidden" />
                  <CaptionsOnIcon className="hidden group-data-[active]/cc:block" />
                </CaptionsButton>
              </WithTooltip>
              <SettingsMenu />
              <WithTooltip>
                <CastButton render={<IconButton />} className="group/cast">
                  <CastEnterIcon className="block group-data-[cast-state=connected]/cast:hidden" />
                  <CastExitIcon className="hidden group-data-[cast-state=connected]/cast:block" />
                </CastButton>
              </WithTooltip>
              <WithTooltip>
                <AirPlayButton render={<IconButton />} className="group/airplay">
                  <AirPlayEnterIcon className="block group-data-[airplay-state=connected]/airplay:hidden" />
                  <AirPlayExitIcon className="hidden group-data-[airplay-state=connected]/airplay:block" />
                </AirPlayButton>
              </WithTooltip>
              <WithTooltip>
                <PiPButton render={renderToggle((state) => state.pip)} className="group/pip">
                  <PipEnterIcon className="block group-data-[pip]/pip:hidden" />
                  <PipExitIcon className="hidden group-data-[pip]/pip:block" />
                </PiPButton>
              </WithTooltip>
              <WithTooltip>
                <FullscreenButton render={renderToggle((state) => state.fullscreen)} className="group/fs">
                  <FullscreenEnterIcon className="block group-data-[fullscreen]/fs:hidden" />
                  <FullscreenExitIcon className="hidden group-data-[fullscreen]/fs:block" />
                </FullscreenButton>
              </WithTooltip>
            </div>
          </Tooltip.Provider>
        </Controls.Content>
      </Controls.Root>
      <StatusIndicators />
      <PlayerBehaviors />
    </>
  );
}
