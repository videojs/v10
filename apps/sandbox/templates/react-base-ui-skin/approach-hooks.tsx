// SPIKE approach 2: Base UI components render and interact; Video.js supplies state and actions through
// `usePlayer(selector)`, the store's action methods, and the option hooks. No Video.js UI component is used here.
// Friction is called out inline as "Friction:".

import { Button } from '@app/components/ui/button';
import { Menu } from '@base-ui/react/menu';
import { Popover } from '@base-ui/react/popover';
import { Slider } from '@base-ui/react/slider';
import { Toggle } from '@base-ui/react/toggle';
import { Tooltip } from '@base-ui/react/tooltip';
import {
  selectControls,
  selectFullscreen,
  selectPlayback,
  selectTextTrack,
  selectTime,
  selectVolume,
  useCaptionsOptions,
  useContainer,
  useHotkeyShortcut,
  usePlaybackRateOptions,
  usePlayer,
  useQualityOptions,
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
import { type ReactElement, type ReactNode, useState } from 'react';

import {
  BAR_CLASS,
  BAR_HIDDEN_CLASS,
  formatTime,
  ICON_BUTTON_CLASS,
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  POPUP_CLASS,
  ROW_CLASS,
  TOOLTIP_CLASS,
} from './shared';

/**
 * Base UI tooltip with a Video.js hotkey hint. Friction: Video.js buttons push their translated label into a Video.js
 * tooltip through context; here the label is written by hand and only the shortcut comes from Video.js
 * (`useHotkeyShortcut` reads the container's hotkey coordinator).
 */
function HotkeyTooltip({ label, action, children }: { label: string; action?: string; children: ReactElement }) {
  const container = useContainer();
  const shortcut = useHotkeyShortcut(action);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal container={container}>
        <Tooltip.Positioner side="top" sideOffset={6}>
          <Tooltip.Popup className={TOOLTIP_CLASS}>
            {label}
            {shortcut.shortcut ? <span className="ml-1 text-neutral-500">{shortcut.shortcut}</span> : null}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function PlayToggle() {
  const playback = usePlayer(selectPlayback);
  if (!playback) return null;

  const label = playback.ended ? 'Replay' : playback.paused ? 'Play' : 'Pause';

  return (
    <HotkeyTooltip label={label} action="togglePaused">
      <Button
        variant="ghost"
        size="icon"
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        onClick={() => void playback.togglePaused()}
      >
        {playback.ended ? <RestartIcon /> : playback.paused ? <PlayIcon /> : <PauseIcon />}
      </Button>
    </HotkeyTooltip>
  );
}

/**
 * Base UI Slider driven by time state. Friction: Video.js's own slider updates the DOM during a drag without React
 * renders and throttles seeks; a controlled Base UI slider re-renders per pointer move, so the drag value is held
 * locally and committed once.
 */
function SeekSlider() {
  const time = usePlayer(selectTime);
  const [dragValue, setDragValue] = useState<number | null>(null);

  if (!time || !Number.isFinite(time.duration) || time.duration <= 0) return null;

  const value = dragValue ?? time.currentTime;

  return (
    <Slider.Root
      className="group/slider w-full"
      aria-label="Seek"
      min={0}
      max={time.duration}
      step={0.1}
      value={value}
      onValueChange={(next) => setDragValue(next)}
      onValueCommitted={(next) => {
        setDragValue(null);
        void time.seek(next);
      }}
      thumbAlignment="edge"
    >
      <Slider.Control className="flex h-5 w-full touch-none items-center select-none">
        <Slider.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/slider:h-1.5">
          <Slider.Indicator className="bg-white" />
        </Slider.Track>
        <Slider.Thumb
          aria-valuetext={formatTime(value)}
          className="size-3.5 rounded-full border border-white/40 bg-white opacity-0 shadow transition-opacity group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 data-[dragging]:opacity-100"
        />
      </Slider.Control>
    </Slider.Root>
  );
}

function VolumeControl() {
  const volume = usePlayer(selectVolume);
  const container = useContainer();

  if (!volume || volume.mutedAvailability === 'unsupported') return null;

  const level = volume.muted || volume.volume === 0 ? 'off' : volume.volume < 0.5 ? 'low' : 'high';
  const Icon = level === 'off' ? VolumeOffIcon : level === 'low' ? VolumeLowIcon : VolumeHighIcon;

  return (
    <Popover.Root>
      <HotkeyTooltip label={volume.muted ? 'Unmute' : 'Mute'} action="toggleMuted">
        <Popover.Trigger
          openOnHover
          delay={100}
          render={
            /* Friction: `Toggle` owns `aria-pressed`; a mute button is a toggle, so that fits. Video.js's own
               MuteButton would instead expose `data-volume-level` for icon switching; here the level is derived. */
            <Toggle
              className={ICON_BUTTON_CLASS + ' inline-flex size-8 items-center justify-center rounded-lg'}
              aria-label={volume.muted ? 'Unmute' : 'Mute'}
              pressed={volume.muted}
              onPressedChange={() => volume.toggleMuted()}
            >
              <Icon />
            </Toggle>
          }
        />
      </HotkeyTooltip>
      {volume.volumeAvailability === 'available' ? (
        <Popover.Portal container={container}>
          <Popover.Positioner side="top" sideOffset={6}>
            <Popover.Popup className={`${POPUP_CLASS} flex h-36 items-center px-3 py-3`}>
              <Slider.Root
                aria-label="Volume"
                orientation="vertical"
                min={0}
                max={1}
                step={0.05}
                value={volume.muted ? 0 : volume.volume}
                onValueChange={(next) => volume.setVolume(next)}
                className="h-full"
              >
                <Slider.Control className="flex h-full w-5 touch-none items-center justify-center select-none">
                  <Slider.Track className="relative h-full w-1 overflow-hidden rounded-full bg-white/25">
                    <Slider.Indicator className="bg-white" />
                  </Slider.Track>
                  <Slider.Thumb className="size-3.5 rounded-full border border-white/40 bg-white shadow focus-visible:ring-2 focus-visible:ring-white/60" />
                </Slider.Control>
              </Slider.Root>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      ) : null}
    </Popover.Root>
  );
}

function TimeReadout() {
  const time = usePlayer(selectTime);
  if (!time) return null;

  return (
    <div className="ml-1 text-sm tabular-nums">
      <time>{formatTime(time.currentTime)}</time>
      <span className="text-white/60"> / </span>
      <time className="text-white/60">{formatTime(time.duration)}</time>
    </div>
  );
}

function CaptionsToggle() {
  const textTrack = usePlayer(selectTextTrack);

  if (
    !textTrack ||
    textTrack.textTrackList.filter((t) => t.kind === 'subtitles' || t.kind === 'captions').length === 0
  ) {
    return null;
  }

  return (
    <HotkeyTooltip label={textTrack.subtitlesShowing ? 'Disable captions' : 'Enable captions'} action="toggleSubtitles">
      <Toggle
        className={ICON_BUTTON_CLASS + ' inline-flex size-8 items-center justify-center rounded-lg'}
        aria-label="Captions"
        pressed={textTrack.subtitlesShowing}
        onPressedChange={() => textTrack.toggleSubtitles()}
      >
        {textTrack.subtitlesShowing ? <CaptionsOnIcon /> : <CaptionsOffIcon />}
      </Toggle>
    </HotkeyTooltip>
  );
}

/** One Base UI radio group per Video.js option hook. The hooks return translated labels, values, and a setter. */
function OptionGroup({
  label,
  options,
}: {
  label: string;
  options: {
    value: string;
    options: readonly { value: string; label: ReactNode; disabled: boolean }[];
    setValue: (value: string) => void;
  } | null;
}) {
  if (!options || options.options.length === 0) return null;

  return (
    <Menu.Group>
      <Menu.GroupLabel className={MENU_LABEL_CLASS}>{label}</Menu.GroupLabel>
      <Menu.RadioGroup value={options.value} onValueChange={(value: string) => options.setValue(value)}>
        {options.options.map((option) => (
          <Menu.RadioItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={`${MENU_ITEM_CLASS} relative`}
          >
            <Menu.RadioItemIndicator className="absolute left-2 flex size-4 items-center justify-center [&_svg]:size-3.5">
              <CheckIcon />
            </Menu.RadioItemIndicator>
            {option.label}
          </Menu.RadioItem>
        ))}
      </Menu.RadioGroup>
    </Menu.Group>
  );
}

function SettingsMenu() {
  const container = useContainer();
  const rates = usePlaybackRateOptions();
  const captions = useCaptionsOptions();
  const quality = useQualityOptions();

  return (
    <Menu.Root modal={false}>
      <HotkeyTooltip label="Settings">
        <Menu.Trigger
          render={<Button variant="ghost" size="icon" className={ICON_BUTTON_CLASS} aria-label="Settings" />}
        >
          <GearIcon />
        </Menu.Trigger>
      </HotkeyTooltip>
      {/* Friction: Base UI portals to <body> by default, which leaves the player in fullscreen. Point the portal at the
          Video.js container. */}
      <Menu.Portal container={container}>
        <Menu.Positioner side="top" align="end" sideOffset={6}>
          <Menu.Popup className={`${POPUP_CLASS} min-w-56`}>
            <OptionGroup label="Speed" options={rates} />
            {rates && captions ? <Menu.Separator className="my-1 h-px bg-white/10" /> : null}
            <OptionGroup label="Captions" options={captions} />
            {quality && quality.options.length > 0 ? <Menu.Separator className="my-1 h-px bg-white/10" /> : null}
            <OptionGroup label="Quality" options={quality} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function FullscreenToggle() {
  const fullscreen = usePlayer(selectFullscreen);
  if (!fullscreen || fullscreen.fullscreenAvailability === 'unsupported') return null;

  return (
    <HotkeyTooltip label={fullscreen.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} action="toggleFullscreen">
      <Button
        variant="ghost"
        size="icon"
        className={ICON_BUTTON_CLASS}
        aria-label={fullscreen.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={() => void fullscreen.toggleFullscreen()}
      >
        {fullscreen.fullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
      </Button>
    </HotkeyTooltip>
  );
}

export function HooksApproachControls() {
  const controls = usePlayer(selectControls);
  // Friction: the controls feature hides the bar on inactivity, but an open Base UI popup does not hold it open the
  // way Video.js popups do (they take a controls lock). `requestControlsLock()` is available for that.
  const visible = controls?.controlsVisible ?? true;

  return (
    <Tooltip.Provider delay={300}>
      <div className={`${BAR_CLASS} ${visible ? '' : BAR_HIDDEN_CLASS}`} data-visible={visible || undefined}>
        <SeekSlider />
        <div className={ROW_CLASS}>
          <PlayToggle />
          <VolumeControl />
          <TimeReadout />
          <div className="grow" />
          <CaptionsToggle />
          <SettingsMenu />
          <FullscreenToggle />
        </div>
      </div>
    </Tooltip.Provider>
  );
}
