// SPIKE approach 2 with Radix: Radix primitives render and interact; Video.js supplies state and actions through
// `usePlayer(selector)`, the store's action methods, availability flags, and the option hooks. Feature parity with the
// default video skin where a hook-fed Radix primitive can reach it; gaps are called out inline as "Gap:".

import { PlayerBehaviors } from '@app/shared/react/library-skin-harness';
import {
  selectBuffer,
  selectControls,
  selectError,
  selectFullscreen,
  selectMetadata,
  selectPiP,
  selectPlayback,
  selectRemotePlayback,
  selectTextTrack,
  selectTime,
  selectVolume,
  useAudioTrackOptions,
  useCaptionsOptions,
  useContainer,
  useHotkeyShortcut,
  usePlaybackRateOptions,
  usePlayer,
  useQualityOptions,
} from '@videojs/react';
import {
  AirPlayEnterIcon,
  AirPlayExitIcon,
  CaptionsOffIcon,
  CaptionsOnIcon,
  CheckIcon,
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
import { AlertDialog, DropdownMenu, Popover, Slider, Toggle, Tooltip } from 'radix-ui';
import { type ReactElement, type ReactNode, useState } from 'react';

import {
  BAR_CLASS,
  BAR_HIDDEN_CLASS,
  DIALOG_CLASS,
  formatTime,
  ICON_BUTTON_CLASS,
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  OVERLAY_CLASS,
  POPUP_CLASS,
  ROW_CLASS,
  TEXT_BUTTON_CLASS,
  TOOLTIP_CLASS,
} from './shared';

/** Radix tooltip with a Video.js hotkey hint; the label is hand-written, the shortcut comes from the container. */
function HotkeyTooltip({ label, action, children }: { label: string; action?: string; children: ReactElement }) {
  const container = useContainer();
  const shortcut = useHotkeyShortcut(action);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={container}>
        <Tooltip.Content side="top" sideOffset={6} className={TOOLTIP_CLASS}>
          {label}
          {shortcut.shortcut ? <span className="ml-1 text-neutral-500">{shortcut.shortcut}</span> : null}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function PosterOverlay() {
  const playback = usePlayer(selectPlayback);
  const metadata = usePlayer(selectMetadata);
  if (!playback || !metadata?.poster || playback.started) return null;

  return <img alt="" src={metadata.poster} className="pointer-events-none absolute inset-0 size-full object-cover" />;
}

function BufferingSpinner() {
  const playback = usePlayer(selectPlayback);
  // Gap: the Video.js indicator debounces short stalls; this shows immediately.
  if (!playback?.waiting) return null;

  return (
    <div className={OVERLAY_CLASS}>
      <SpinnerIcon className="size-14 animate-spin" />
    </div>
  );
}

/** Radix AlertDialog driven by the error feature; dismissing calls `dismissError()`. */
function ErrorAlert() {
  const error = usePlayer(selectError);
  const container = useContainer();

  if (!error) return null;

  return (
    <AlertDialog.Root open={error.error !== null} onOpenChange={(open) => !open && error.dismissError()}>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Overlay className="absolute inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className={DIALOG_CLASS}>
          <AlertDialog.Title className="text-base font-semibold">Playback error</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-white/80">
            {error.error?.message ?? 'Something went wrong.'}
          </AlertDialog.Description>
          <div className="flex justify-end">
            <AlertDialog.Action className={TEXT_BUTTON_CLASS}>Dismiss</AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
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

function BufferedRange() {
  const time = usePlayer(selectTime);
  const buffer = usePlayer(selectBuffer);
  const end = buffer?.buffered.at(-1)?.[1] ?? 0;
  if (!time || !end) return null;

  return (
    <div
      className="absolute inset-y-0 left-0 bg-white/30"
      style={{ width: `${Math.min(100, (end / time.duration) * 100)}%` }}
    />
  );
}

/**
 * Radix Slider takes `number[]`; the drag value is held locally and `onValueCommit` seeks once. Gap: no pointer
 * preview, so no storyboard thumbnail or chapter title on hover, and no chapter segments.
 */
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
        <BufferedRange />
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
  const [remaining, setRemaining] = useState(true);

  if (!time) return null;

  return (
    <div className="ml-1 text-sm tabular-nums">
      <time>{formatTime(time.currentTime)}</time>
      <span className="text-white/60"> / </span>
      <button
        type="button"
        className="cursor-pointer text-white/60 hover:text-white"
        aria-label={remaining ? 'Show duration' : 'Show remaining time'}
        onClick={() => setRemaining((value) => !value)}
      >
        <time>{remaining ? `-${formatTime(time.duration - time.currentTime)}` : formatTime(time.duration)}</time>
      </button>
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
    hidden: boolean;
  } | null;
}

/** One Radix radio group per Video.js option hook; the hook's `hidden` flag is the availability gate. */
function OptionGroup({ label, options }: OptionGroupProps) {
  if (!options || options.hidden || options.options.length === 0) return null;

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
  const quality = useQualityOptions();
  const audio = useAudioTrackOptions();
  const rates = usePlaybackRateOptions();
  const captions = useCaptionsOptions();

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
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={6}
          className={`${POPUP_CLASS} max-h-[min(70vh,20rem)] min-w-56 overflow-y-auto`}
        >
          <OptionGroup label="Quality" options={quality} />
          <OptionGroup label="Audio" options={audio} />
          <OptionGroup label="Speed" options={rates} />
          <OptionGroup label="Captions" options={captions} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** One remote-playback button standing in for the skin's Cast and AirPlay pair; gated on availability. */
function RemotePlaybackToggle() {
  const remote = usePlayer(selectRemotePlayback);
  if (!remote || remote.remotePlaybackAvailability === 'unsupported') return null;

  const connected = remote.remotePlaybackState === 'connected';
  const label = connected ? 'Stop remote playback' : 'Play on another device';

  return (
    <HotkeyTooltip label={label}>
      <Toggle.Root
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        pressed={connected}
        disabled={remote.remotePlaybackAvailability === 'unavailable'}
        onPressedChange={() => void remote.toggleRemotePlayback()}
      >
        {connected ? <AirPlayExitIcon /> : <AirPlayEnterIcon />}
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

function PiPToggle() {
  const pip = usePlayer(selectPiP);
  if (!pip || pip.pipAvailability === 'unsupported') return null;

  const label = pip.pip ? 'Exit picture-in-picture' : 'Enter picture-in-picture';

  return (
    <HotkeyTooltip label={label} action="togglePictureInPicture">
      <Toggle.Root
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        pressed={pip.pip}
        disabled={pip.pipAvailability === 'unavailable'}
        onPressedChange={() => void pip.togglePictureInPicture()}
      >
        {pip.pip ? <PipExitIcon /> : <PipEnterIcon />}
      </Toggle.Root>
    </HotkeyTooltip>
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
    <>
      <PosterOverlay />
      <BufferingSpinner />
      <ErrorAlert />
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
            <RemotePlaybackToggle />
            <PiPToggle />
            <FullscreenToggle />
          </div>
        </div>
      </Tooltip.Provider>
      {/* Gap: no exported hook for the transient seek/volume/status indicators. */}
      <PlayerBehaviors />
    </>
  );
}
