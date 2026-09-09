// SPIKE approach 1 with Radix: Video.js components own behaviour, state, and accessibility; Radix primitives are
// handed in through `render`. Radix has no Button primitive, so the plain buttons render into a shadcn-style button
// built on Radix `Slot`, and the toggle-shaped ones render into Radix `Toggle` using the *function form* of `render`,
// which receives Video.js state and can drive Radix's controlled `pressed`. Friction is called out inline.

import {
  CaptionsButton,
  Controls,
  FullscreenButton,
  type HTMLProps,
  Menu,
  type RenderFunction,
  MuteButton,
  PlayButton,
  Slider,
  Time,
  TimeSlider,
  Tooltip,
  VolumePopover,
  VolumeSlider,
} from '@videojs/react';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  CheckIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  GearIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react/icons';
import { CaptionsRadioGroup } from '@videojs/react/ui/captions-radio-group';
import { PlaybackRateRadioGroup } from '@videojs/react/ui/playback-rate-radio-group';
import { QualityRadioGroup } from '@videojs/react/ui/quality-radio-group';
import { Slot, Toggle } from 'radix-ui';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

import {
  BAR_CLASS,
  BAR_HIDDEN_CLASS,
  ICON_BUTTON_CLASS,
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  POPUP_CLASS,
  ROW_CLASS,
  TOOLTIP_CLASS,
} from './shared';

/**
 * A shadcn-style button on Radix `Slot`. With `asChild` the styles and props are merged onto the child; without it a
 * `<button>` renders. Video.js will `render` into this, so it must forward `ref` and spread unknown props — it does.
 */
function IconButton({ asChild, className, ...props }: ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';

  return <Comp className={`${ICON_BUTTON_CLASS} ${className ?? ''}`} {...props} />;
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
 * Function-form `render`: Video.js hands over merged DOM props (handlers, ARIA, data-*, ref) plus its state, and the
 * Radix Toggle gets `pressed` from that state. Friction: Toggle's own click handler flips an internal `pressed`; since
 * `pressed` is controlled here and Video.js's `onClick` runs after Radix's, both stay in step. Radix also sets
 * `aria-pressed`, which Video.js buttons do not; for mute/captions/fullscreen that is a fair description.
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

function SettingsMenu() {
  return (
    <Menu.Root side="top" align="end">
      <PlaybackRateRadioGroup.Root>
        <CaptionsRadioGroup.Root>
          <QualityRadioGroup.Root>
            <WithTooltip>
              <Menu.Trigger render={<IconButton />} aria-label="Settings">
                <GearIcon />
              </Menu.Trigger>
            </WithTooltip>
            <Menu.Popup className={`${POPUP_CLASS} min-w-56`}>
              <Menu.Content className="flex flex-col outline-none">
                <Menu.Group>
                  <Menu.GroupLabel className={MENU_LABEL_CLASS}>Speed</Menu.GroupLabel>
                  <PlaybackRateRadioGroup.Options
                    renderItem={(props, item) => <RadioItem {...props}>{item.label}</RadioItem>}
                  />
                </Menu.Group>
                <Menu.Separator className="my-1 h-px bg-white/10" />
                <Menu.Group>
                  <Menu.GroupLabel className={MENU_LABEL_CLASS}>Captions</Menu.GroupLabel>
                  <CaptionsRadioGroup.Options
                    renderItem={(props, item) => <RadioItem {...props}>{item.label}</RadioItem>}
                  />
                </Menu.Group>
                <Menu.Separator className="my-1 h-px bg-white/10" />
                <Menu.Group>
                  <Menu.GroupLabel className={MENU_LABEL_CLASS}>Quality</Menu.GroupLabel>
                  <QualityRadioGroup.Options
                    renderItem={(props, item) => <RadioItem {...props}>{item.label}</RadioItem>}
                  />
                </Menu.Group>
              </Menu.Content>
            </Menu.Popup>
          </QualityRadioGroup.Root>
        </CaptionsRadioGroup.Root>
      </PlaybackRateRadioGroup.Root>
    </Menu.Root>
  );
}

/** Friction: same as Base UI — a Radix Slider cannot be rendered into ours (pointer on both roots, two sliders). */
function RadixStyledTimeSlider() {
  return (
    <TimeSlider.Root className="group/slider relative flex h-5 w-full touch-none items-center select-none">
      <TimeSlider.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/slider:h-1.5">
        <TimeSlider.Buffer className="absolute inset-y-0 left-0 w-[var(--media-slider-buffer)] bg-white/30" />
        <TimeSlider.Fill className="absolute inset-y-0 left-0 w-[var(--media-slider-fill)] bg-white" />
      </TimeSlider.Track>
      <TimeSlider.Thumb className="absolute left-[var(--media-slider-fill)] block size-3.5 -translate-x-1/2 rounded-full border border-white/40 bg-white opacity-0 shadow transition-opacity group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 data-[dragging]:opacity-100" />
      <TimeSlider.Preview className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-white px-2 py-1 text-xs font-medium text-neutral-900 shadow">
        <TimeSlider.ChapterTitle className="mr-1 text-neutral-500" />
        <TimeSlider.Value type="pointer" />
      </TimeSlider.Preview>
    </TimeSlider.Root>
  );
}

function VolumeControl() {
  return (
    <VolumePopover.Root side="top">
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

export function RenderApproachControls() {
  return (
    <Controls.Root>
      <Controls.Content className={(state) => `${BAR_CLASS} ${state.visible ? '' : BAR_HIDDEN_CLASS}`}>
        <Tooltip.Provider>
          <RadixStyledTimeSlider />
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
              <Time.Value type="duration" className="text-white/60" />
            </div>
            <div className="grow" />
            <WithTooltip>
              <CaptionsButton render={renderToggle((state) => state.subtitlesShowing)} className="group/cc">
                <CaptionsOffIcon className="block group-data-[active]/cc:hidden" />
                <CaptionsOnIcon className="hidden group-data-[active]/cc:block" />
              </CaptionsButton>
            </WithTooltip>
            <SettingsMenu />
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
  );
}
