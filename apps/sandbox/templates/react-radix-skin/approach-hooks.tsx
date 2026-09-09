// SPIKE approach 2 with Radix: Radix primitives render and interact; Video.js supplies state and actions through
// `usePlayer(selector)`, the store's action methods, and the option hooks. No Video.js UI component is used here.

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
import { DropdownMenu, Popover, Slider, Toggle, Tooltip } from 'radix-ui';
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

/** Radix tooltip with a Video.js hotkey hint; the label is hand-written, the shortcut comes from the container. */
function HotkeyTooltip({ label, action, children }: { label: string; action?: string; children: ReactElement }) {
  const container = useContainer();
  const shortcut = useHotkeyShortcut(action);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      {/* Friction: Radix portals to <body>; point it at the Video.js container so fullscreen keeps it. */}
      <Tooltip.Portal container={container}>
        <Tooltip.Content side="top" sideOffset={6} className={TOOLTIP_CLASS}>
          {label}
          {shortcut.shortcut ? <span className="ml-1 text-neutral-500">{shortcut.shortcut}</span> : null}
        </Tooltip.Content>
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
      <button
        type="button"
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        onClick={() => void playback.togglePaused()}
      >
        {playback.ended ? <RestartIcon /> : playback.paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </HotkeyTooltip>
  );
}

/** Radix Slider takes `number[]`; single thumb here. Drag value is local; `onValueCommit` seeks once. */
function SeekSlider() {
  const time = usePlayer(selectTime);
  const [dragValue, setDragValue] = useState<number | null>(null);

  if (!time || !Number.isFinite(time.duration) || time.duration <= 0) return null;

  const value = dragValue ?? time.currentTime;

  return (
    <Slider.Root
      className="group/slider relative flex h-5 w-full touch-none items-center select-none"
      min={0}
      max={time.duration}
      step={0.1}
      value={[value]}
      onValueChange={([next]) => setDragValue(next ?? null)}
      onValueCommit={([next]) => {
        setDragValue(null);

        if (next !== undefined) void time.seek(next);
      }}
    >
      <Slider.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/slider:h-1.5">
        <Slider.Range className="absolute h-full bg-white" />
      </Slider.Track>
      <Slider.Thumb
        aria-label="Seek"
        aria-valuetext={formatTime(value)}
        className="block size-3.5 rounded-full border border-white/40 bg-white opacity-0 shadow transition-opacity group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
      />
    </Slider.Root>
  );
}

/**
 * Friction: Radix Popover has no hover-open, and a click on the trigger would collide with mute. The popover is
 * controlled from pointer enter/leave on a wrapper, so click stays the mute toggle.
 */
function VolumeControl() {
  const volume = usePlayer(selectVolume);
  const container = useContainer();
  const [open, setOpen] = useState(false);

  if (!volume || volume.mutedAvailability === 'unsupported') return null;

  const level = volume.muted || volume.volume === 0 ? 'off' : volume.volume < 0.5 ? 'low' : 'high';
  const Icon = level === 'off' ? VolumeOffIcon : level === 'low' ? VolumeLowIcon : VolumeHighIcon;
  const label = volume.muted ? 'Unmute' : 'Mute';

  return (
    <span onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)} className="inline-flex">
      <Popover.Root open={open && volume.volumeAvailability === 'available'} onOpenChange={setOpen}>
        <HotkeyTooltip label={label} action="toggleMuted">
          <Popover.Anchor asChild>
            <Toggle.Root
              className={ICON_BUTTON_CLASS}
              aria-label={label}
              pressed={volume.muted}
              onPressedChange={() => volume.toggleMuted()}
            >
              <Icon />
            </Toggle.Root>
          </Popover.Anchor>
        </HotkeyTooltip>
        <Popover.Portal container={container}>
          <Popover.Content
            side="top"
            sideOffset={6}
            onOpenAutoFocus={(event) => event.preventDefault()}
            className={`${POPUP_CLASS} flex h-36 items-center px-3 py-3`}
          >
            <Slider.Root
              orientation="vertical"
              min={0}
              max={1}
              step={0.05}
              value={[volume.muted ? 0 : volume.volume]}
              onValueChange={([next]) => {
                if (next !== undefined) volume.setVolume(next);
              }}
              className="relative flex h-full w-5 touch-none flex-col items-center select-none"
            >
              <Slider.Track className="relative h-full w-1 grow overflow-hidden rounded-full bg-white/25">
                <Slider.Range className="absolute w-full bg-white" />
              </Slider.Track>
              <Slider.Thumb
                aria-label="Volume"
                className="block size-3.5 rounded-full border border-white/40 bg-white shadow focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
              />
            </Slider.Root>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
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
  const hasTracks = textTrack?.textTrackList.some((t) => t.kind === 'subtitles' || t.kind === 'captions');
  if (!textTrack || !hasTracks) return null;

  return (
    <HotkeyTooltip label={textTrack.subtitlesShowing ? 'Disable captions' : 'Enable captions'} action="toggleSubtitles">
      <Toggle.Root
        className={ICON_BUTTON_CLASS}
        aria-label="Captions"
        pressed={textTrack.subtitlesShowing}
        onPressedChange={() => textTrack.toggleSubtitles()}
      >
        {textTrack.subtitlesShowing ? <CaptionsOnIcon /> : <CaptionsOffIcon />}
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

interface OptionGroupProps {
  label: string;
  options: {
    value: string;
    options: readonly { value: string; label: ReactNode; disabled: boolean }[];
    setValue: (value: string) => void;
  } | null;
}

/** One Radix radio group per Video.js option hook. */
function OptionGroup({ label, options }: OptionGroupProps) {
  if (!options || options.options.length === 0) return null;

  return (
    <DropdownMenu.Group>
      <DropdownMenu.Label className={MENU_LABEL_CLASS}>{label}</DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={options.value} onValueChange={options.setValue}>
        {options.options.map((option) => (
          <DropdownMenu.RadioItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={MENU_ITEM_CLASS}
          >
            <DropdownMenu.ItemIndicator className="absolute left-2 flex size-4 items-center justify-center [&_svg]:size-3.5">
              <CheckIcon />
            </DropdownMenu.ItemIndicator>
            {option.label}
          </DropdownMenu.RadioItem>
        ))}
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Group>
  );
}

function SettingsMenu() {
  const container = useContainer();
  const rates = usePlaybackRateOptions();
  const captions = useCaptionsOptions();
  const quality = useQualityOptions();

  return (
    <DropdownMenu.Root modal={false}>
      <HotkeyTooltip label="Settings">
        <DropdownMenu.Trigger asChild>
          <button type="button" className={ICON_BUTTON_CLASS} aria-label="Settings">
            <GearIcon />
          </button>
        </DropdownMenu.Trigger>
      </HotkeyTooltip>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content side="top" align="end" sideOffset={6} className={`${POPUP_CLASS} min-w-56`}>
          <OptionGroup label="Speed" options={rates} />
          {rates && captions ? <DropdownMenu.Separator className="my-1 h-px bg-white/10" /> : null}
          <OptionGroup label="Captions" options={captions} />
          {quality && quality.options.length > 0 ? <DropdownMenu.Separator className="my-1 h-px bg-white/10" /> : null}
          <OptionGroup label="Quality" options={quality} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function FullscreenToggle() {
  const fullscreen = usePlayer(selectFullscreen);
  if (!fullscreen || fullscreen.fullscreenAvailability === 'unsupported') return null;

  const label = fullscreen.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';

  return (
    <HotkeyTooltip label={label} action="toggleFullscreen">
      <Toggle.Root
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        pressed={fullscreen.fullscreen}
        onPressedChange={() => void fullscreen.toggleFullscreen()}
      >
        {fullscreen.fullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

export function HooksApproachControls() {
  const controls = usePlayer(selectControls);
  const visible = controls?.controlsVisible ?? true;

  return (
    <Tooltip.Provider delayDuration={300}>
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
