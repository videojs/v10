// SPIKE approach 1: Video.js components own behaviour, state, and accessibility; Base UI supplies the rendered
// element through `render`. Where a Video.js compound owns its own DOM interaction (sliders, menus, popovers) the
// compound stays and only takes Base UI-flavoured classes. Friction is called out inline as "Friction:".

import { Button } from '@app/components/ui/button';
import {
  CaptionsButton,
  Controls,
  FullscreenButton,
  Menu,
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
import type { ReactElement, ReactNode } from 'react';

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

/** A Base UI ghost icon button. Every Video.js button below renders into one of these. */
const IconButton = <Button variant="ghost" size="icon" className={ICON_BUTTON_CLASS} />;

/** Video.js tooltip around a Video.js button: the button pushes its translated label and shortcut into the tooltip. */
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
              {/* Friction: the trigger's label comes from Video.js i18n only if the trigger is a Video.js button; a
                  bare Base UI button here needs its own aria-label. */}
              <Menu.Trigger render={IconButton} aria-label="Settings">
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

/**
 * Friction: a Base UI `Slider` cannot be handed to `TimeSlider.Root`'s `render`: both own pointer handling on their
 * root and both put `role="slider"` somewhere. So the Video.js slider stays and takes Base UI's slider classes (the
 * same ones `@app/components/ui/slider` uses), fed from `--media-slider-fill` / `--media-slider-buffer`.
 */
function BaseUiStyledTimeSlider() {
  return (
    <TimeSlider.Root className="group/slider relative flex h-5 w-full items-center">
      <TimeSlider.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/slider:h-1.5">
        <TimeSlider.Buffer className="absolute inset-y-0 left-0 w-[var(--media-slider-buffer)] bg-white/30" />
        <TimeSlider.Fill className="absolute inset-y-0 left-0 w-[var(--media-slider-fill)] bg-white" />
      </TimeSlider.Track>
      <TimeSlider.Thumb className="absolute left-[var(--media-slider-fill)] size-3.5 -translate-x-1/2 rounded-full border border-white/40 bg-white opacity-0 shadow transition-opacity group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 data-[dragging]:opacity-100" />
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
            <MuteButton render={IconButton} className="group/mute">
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
          className="group/vol relative flex h-full w-5 items-center justify-center"
        >
          <Slider.Track className="relative h-full w-1 overflow-hidden rounded-full bg-white/25">
            <Slider.Fill className="absolute inset-x-0 bottom-0 h-[var(--media-slider-fill)] bg-white" />
          </Slider.Track>
          <Slider.Thumb className="absolute bottom-[var(--media-slider-fill)] size-3.5 translate-y-1/2 rounded-full border border-white/40 bg-white shadow focus-visible:ring-2 focus-visible:ring-white/60" />
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
          <BaseUiStyledTimeSlider />
          <div className={ROW_CLASS}>
            <WithTooltip>
              <PlayButton render={IconButton} className="group/play">
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
              <CaptionsButton render={IconButton} className="group/cc">
                <CaptionsOffIcon className="block group-data-[active]/cc:hidden" />
                <CaptionsOnIcon className="hidden group-data-[active]/cc:block" />
              </CaptionsButton>
            </WithTooltip>
            <SettingsMenu />
            <WithTooltip>
              <FullscreenButton render={IconButton} className="group/fs">
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
