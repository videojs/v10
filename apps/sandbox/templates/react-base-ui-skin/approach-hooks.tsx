// SPIKE approach 2: Base UI components render and interact; Video.js supplies state and actions through
// `usePlayer(selector)`, the store's action methods, availability flags, and the option hooks. Feature parity with the
// default video skin where a hook-fed Base UI component can reach it; gaps are called out inline as "Gap:".

import { Button } from '@app/components/ui/button';
import { PlayerBehaviors } from '@app/shared/react/library-skin-harness';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Menu } from '@base-ui/react/menu';
import { Popover } from '@base-ui/react/popover';
import { Slider } from '@base-ui/react/slider';
import { Toggle } from '@base-ui/react/toggle';
import { Tooltip } from '@base-ui/react/tooltip';
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
  TOOLTIP_CLASS,
} from './shared';

const TOGGLE_CLASS = `${ICON_BUTTON_CLASS} inline-flex size-8 items-center justify-center rounded-lg`;

/**
 * Base UI tooltip with a Video.js hotkey hint. Friction: Video.js buttons push their translated label into a Video.js
 * tooltip through context; here the label is written by hand and only the shortcut comes from Video.js.
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

/** Base UI AlertDialog driven by the error feature; dismissing calls `dismissError()`. */
function ErrorAlert() {
  const error = usePlayer(selectError);
  const container = useContainer();

  if (!error) return null;

  return (
    <AlertDialog.Root open={error.error !== null} onOpenChange={(open) => !open && error.dismissError()}>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Backdrop className="absolute inset-0 bg-black/60" />
        <AlertDialog.Popup className={DIALOG_CLASS}>
          <AlertDialog.Title className="text-base font-semibold">Playback error</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-white/80">
            {error.error?.message ?? 'Something went wrong.'}
          </AlertDialog.Description>
          <div className="flex justify-end">
            <AlertDialog.Close render={<Button variant="secondary" size="sm" />}>Dismiss</AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
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
 * Base UI Slider driven by time state; the drag value is held locally and committed once. Gap: no pointer preview, so
 * no storyboard thumbnail or chapter title on hover, and no chapter segments; the buffered range is drawn behind the
 * fill from the buffer feature.
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
          <BufferedRange />
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
  const label = volume.muted ? 'Unmute' : 'Mute';

  return (
    <Popover.Root>
      <HotkeyTooltip label={label} action="toggleMuted">
        <Popover.Trigger
          openOnHover
          delay={100}
          render={
            <Toggle
              className={TOGGLE_CLASS}
              aria-label={label}
              pressed={volume.muted}
              onPressedChange={() => volume.toggleMuted()}
            >
              <Icon />
            </Toggle>
          }
        />
      </HotkeyTooltip>
      {/* Availability: iOS reports the level as unavailable, so only mute stays. */}
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

/** Current time plus a duration/remaining toggle, like `Time.Value type="remaining" toggle`. */
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
  // Availability: no caption tracks, no button, matching CaptionsButton's `hidden` state.
  if (!textTrack || !hasTracks) return null;

  return (
    <HotkeyTooltip label={textTrack.subtitlesShowing ? 'Disable captions' : 'Enable captions'} action="toggleSubtitles">
      <Toggle
        className={TOGGLE_CLASS}
        aria-label="Captions"
        pressed={textTrack.subtitlesShowing}
        onPressedChange={() => textTrack.toggleSubtitles()}
      >
        {textTrack.subtitlesShowing ? <CaptionsOnIcon /> : <CaptionsOffIcon />}
      </Toggle>
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

/** One Base UI radio group per Video.js option hook; the hook's `hidden` flag is the availability gate. */
function OptionGroup({ label, options }: OptionGroupProps) {
  if (!options || options.hidden || options.options.length === 0) return null;

  return (
    <Menu.Group>
      <Menu.GroupLabel className={MENU_LABEL_CLASS}>{label}</Menu.GroupLabel>
      <Menu.RadioGroup value={options.value} onValueChange={(value: string) => options.setValue(value)}>
        {options.options.map((option) => (
          <Menu.RadioItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={MENU_ITEM_CLASS}
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
  const quality = useQualityOptions();
  const audio = useAudioTrackOptions();
  const rates = usePlaybackRateOptions();
  const captions = useCaptionsOptions();

  return (
    <Menu.Root modal={false}>
      <HotkeyTooltip label="Settings">
        <Menu.Trigger
          render={<Button variant="ghost" size="icon" className={ICON_BUTTON_CLASS} aria-label="Settings" />}
        >
          <GearIcon />
        </Menu.Trigger>
      </HotkeyTooltip>
      <Menu.Portal container={container}>
        <Menu.Positioner side="top" align="end" sideOffset={6}>
          <Menu.Popup className={`${POPUP_CLASS} max-h-[min(70vh,20rem)] min-w-56 overflow-y-auto`}>
            <OptionGroup label="Quality" options={quality} />
            <OptionGroup label="Audio" options={audio} />
            <OptionGroup label="Speed" options={rates} />
            <OptionGroup label="Captions" options={captions} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
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
      <Toggle
        className={TOGGLE_CLASS}
        aria-label={label}
        pressed={connected}
        disabled={remote.remotePlaybackAvailability === 'unavailable'}
        onPressedChange={() => void remote.toggleRemotePlayback()}
      >
        {connected ? <AirPlayExitIcon /> : <AirPlayEnterIcon />}
      </Toggle>
    </HotkeyTooltip>
  );
}

function PiPToggle() {
  const pip = usePlayer(selectPiP);
  if (!pip || pip.pipAvailability === 'unsupported') return null;

  const label = pip.pip ? 'Exit picture-in-picture' : 'Enter picture-in-picture';

  return (
    <HotkeyTooltip label={label} action="togglePictureInPicture">
      <Toggle
        className={TOGGLE_CLASS}
        aria-label={label}
        pressed={pip.pip}
        disabled={pip.pipAvailability === 'unavailable'}
        onPressedChange={() => void pip.togglePictureInPicture()}
      >
        {pip.pip ? <PipExitIcon /> : <PipEnterIcon />}
      </Toggle>
    </HotkeyTooltip>
  );
}

function FullscreenToggle() {
  const fullscreen = usePlayer(selectFullscreen);
  if (!fullscreen || fullscreen.fullscreenAvailability === 'unsupported') return null;

  const label = fullscreen.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';

  return (
    <HotkeyTooltip label={label} action="toggleFullscreen">
      <Toggle
        className={TOGGLE_CLASS}
        aria-label={label}
        pressed={fullscreen.fullscreen}
        onPressedChange={() => void fullscreen.toggleFullscreen()}
      >
        {fullscreen.fullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
      </Toggle>
    </HotkeyTooltip>
  );
}

export function HooksApproachControls() {
  const controls = usePlayer(selectControls);
  // Friction: a library popup does not take the controls lock, so the bar can hide under an open menu.
  const visible = controls?.controlsVisible ?? true;

  return (
    <>
      <PosterOverlay />
      <BufferingSpinner />
      <ErrorAlert />
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
            <RemotePlaybackToggle />
            <PiPToggle />
            <FullscreenToggle />
          </div>
        </div>
      </Tooltip.Provider>
      {/* Gap: the skin's transient seek/volume/status indicators subscribe to input actions through Video.js
          components; there is no exported hook for that yet. Hotkeys and gestures are state-only components. */}
      <PlayerBehaviors />
    </>
  );
}
