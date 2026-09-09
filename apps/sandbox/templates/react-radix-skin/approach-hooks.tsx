// SPIKE approach 2 with Radix: Radix primitives and Radix Icons render and interact; Video.js supplies state and
// actions through `usePlayer(selector)`, the store's action methods, availability flags, the option hooks, the
// text-track feature's chapter and thumbnail cues, and its i18n text tokens so the wording matches the default skin.

import { PlayerBehaviors } from '@app/shared/react/library-skin-harness';
import {
  ChatBubbleIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  DesktopIcon,
  EnterFullScreenIcon,
  ExitFullScreenIcon,
  GearIcon,
  GlobeIcon,
  MixerHorizontalIcon,
  PauseIcon,
  PlayIcon,
  ReloadIcon,
  SpeakerLoudIcon,
  SpeakerModerateIcon,
  SpeakerOffIcon,
  SpeakerQuietIcon,
  StopwatchIcon,
  UpdateIcon,
} from '@radix-ui/react-icons';
import { mapCuesToThumbnails, ThumbnailCore } from '@videojs/core';
import { startText as airplayStartText, stopText as airplayStopText } from '@videojs/core/i18n/text/airplay';
import { muteText, pauseText, playText, replayText, unmuteText } from '@videojs/core/i18n/text/buttons';
import { disableText as captionsDisableText, enableText as captionsEnableText } from '@videojs/core/i18n/text/captions';
import { enterText as fullscreenEnterText, exitText as fullscreenExitText } from '@videojs/core/i18n/text/fullscreen';
import { audioText, captionsText, qualityText, settingsText, speedText } from '@videojs/core/i18n/text/menu';
import { enterText as pipEnterText, exitText as pipExitText } from '@videojs/core/i18n/text/pip';
import { showDurationText, showRemainingText } from '@videojs/core/i18n/text/time';
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
  useTranslator,
} from '@videojs/react';
import { AlertDialog, DropdownMenu, Popover, Slider, Toggle, Tooltip } from 'radix-ui';
import { type ReactElement, type ReactNode, useMemo, useState } from 'react';

import {
  BACKDROP_CLASS,
  BAR_CLASS,
  BAR_HIDDEN_CLASS,
  DIALOG_CLASS,
  formatTime,
  ICON_BUTTON_CLASS,
  MENU_HINT_CLASS,
  MENU_ITEM_CLASS,
  MENU_TRIGGER_ITEM_CLASS,
  OVERLAY_CLASS,
  POPUP_CLASS,
  SECONDARY_GROUP_CLASS,
  TEXT_BUTTON_CLASS,
  TIME_CLASS,
  TIME_GROUP_CLASS,
  TOOLTIP_CLASS,
} from './shared';

/** Radix tooltip with a Video.js hotkey hint; the label is translated with the same tokens the default skin uses. */
function HotkeyTooltip({ label, action, children }: { label: string; action?: string; children: ReactElement }) {
  const container = useContainer();
  const shortcut = useHotkeyShortcut(action);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={container}>
        <Tooltip.Content side="top" sideOffset={8} className={TOOLTIP_CLASS}>
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
  if (!playback?.waiting) return null;

  return (
    <div className={OVERLAY_CLASS}>
      <UpdateIcon className="size-12 animate-spin" />
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
  const t = useTranslator();

  if (!playback) return null;

  const label = t(playback.ended ? replayText : playback.paused ? playText : pauseText);

  return (
    <HotkeyTooltip label={label} action="togglePaused">
      <button
        type="button"
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        onClick={() => void playback.togglePaused()}
      >
        {playback.ended ? <ReloadIcon /> : playback.paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </HotkeyTooltip>
  );
}

const PREVIEW_WIDTH = 160;
const thumbnailCore = new ThumbnailCore();

/**
 * Radix Slider fed by the time, buffer, and text-track features. Radix has no pointer-position API, so hover time is
 * derived from the root's rect; from that the chapter title (`chaptersCues`) and storyboard tile (`thumbnailCues` via
 * the core's media-fragment parser) are looked up. Chapter boundaries are drawn as gaps on the track.
 */
function SeekSlider() {
  const time = usePlayer(selectTime);
  const buffer = usePlayer(selectBuffer);
  const textTrack = usePlayer(selectTextTrack);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const thumbnails = useMemo(
    () => mapCuesToThumbnails(textTrack?.thumbnailCues ?? [], textTrack?.thumbnailTrackSrc ?? undefined),
    [textTrack?.thumbnailCues, textTrack?.thumbnailTrackSrc]
  );

  if (!time || !Number.isFinite(time.duration) || time.duration <= 0) return null;

  const { duration } = time;
  const value = dragValue ?? time.currentTime;
  const bufferedEnd = buffer?.buffered.at(-1)?.[1] ?? 0;
  const hoverTime = hover === null ? null : hover * duration;
  const chapter =
    hoverTime === null
      ? undefined
      : textTrack?.chaptersCues.find((cue) => hoverTime >= cue.startTime && hoverTime < cue.endTime);
  const thumbnail = hoverTime === null ? undefined : thumbnailCore.findActiveThumbnail(thumbnails, hoverTime);
  const thumbnailScale = thumbnail?.width ? PREVIEW_WIDTH / thumbnail.width : 1;
  const boundaries = (textTrack?.chaptersCues ?? []).filter((cue) => cue.endTime < duration);

  return (
    <Slider.Root
      className="group/slider relative flex h-8 grow touch-none items-center select-none"
      min={0}
      max={duration}
      step={0.1}
      value={[value]}
      onValueChange={([next]) => setDragValue(next ?? null)}
      onValueCommit={([next]) => {
        setDragValue(null);

        if (next !== undefined) void time.seek(next);
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();

        setHover(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
      }}
      onPointerLeave={() => setHover(null)}
    >
      <Slider.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/20">
        <div
          className="absolute inset-y-0 left-0 bg-white/20"
          style={{ width: `${(bufferedEnd / duration) * 100}%` }}
        />
        <Slider.Range className="absolute h-full bg-white" />
        {boundaries.map((cue) => (
          <span
            key={cue.startTime}
            className="absolute inset-y-0 w-1 -translate-x-1/2 bg-black/70"
            style={{ left: `${(cue.endTime / duration) * 100}%` }}
          />
        ))}
      </Slider.Track>
      <Slider.Thumb
        aria-label="Seek"
        aria-valuetext={formatTime(value)}
        className="block size-3 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none data-[state=active]:opacity-100"
      />
      {hoverTime !== null ? (
        <div
          className="pointer-events-none absolute bottom-full mb-3 flex -translate-x-1/2 flex-col items-center gap-1"
          style={{
            left: `clamp(${PREVIEW_WIDTH / 2}px, ${hover! * 100}%, calc(100% - ${PREVIEW_WIDTH / 2}px))`,
          }}
        >
          {thumbnail?.width && thumbnail.height ? (
            <div
              className="relative overflow-hidden rounded-lg border border-white/20 bg-black shadow-lg"
              style={{ width: PREVIEW_WIDTH, height: thumbnail.height * thumbnailScale }}
            >
              <img
                alt=""
                src={thumbnail.url}
                className="absolute top-0 left-0 max-w-none origin-top-left"
                style={{
                  transform: `scale(${thumbnailScale}) translate(-${thumbnail.coords?.x ?? 0}px, -${thumbnail.coords?.y ?? 0}px)`,
                }}
              />
            </div>
          ) : null}
          <div className="rounded-md bg-white px-2 py-1 text-xs font-medium text-neutral-900 shadow">
            {chapter ? <span className="mr-1 text-neutral-500">{chapter.text}</span> : null}
            <span className="tabular-nums">{formatTime(hoverTime)}</span>
          </div>
        </div>
      ) : null}
    </Slider.Root>
  );
}

/**
 * Mute toggle with a hover volume popover. No tooltip here: the popover is what hover shows, as in the default skin.
 * Radix Popover has no hover-open, so it is controlled from pointer enter/leave on a wrapper.
 */
function VolumeControl() {
  const volume = usePlayer(selectVolume);
  const container = useContainer();
  const [open, setOpen] = useState(false);
  const t = useTranslator();

  if (!volume || volume.mutedAvailability === 'unsupported') return null;

  const level = volume.muted || volume.volume === 0 ? 0 : volume.volume;
  const Icon =
    level === 0
      ? SpeakerOffIcon
      : level < 0.34
        ? SpeakerQuietIcon
        : level < 0.67
          ? SpeakerModerateIcon
          : SpeakerLoudIcon;
  const label = t(volume.muted ? unmuteText : muteText);

  return (
    <span onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)} className="inline-flex">
      <Popover.Root open={open && volume.volumeAvailability === 'available'} onOpenChange={setOpen}>
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
        <Popover.Portal container={container}>
          <Popover.Content
            side="top"
            sideOffset={8}
            onOpenAutoFocus={(event) => event.preventDefault()}
            data-interactive=""
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
              <Slider.Track className="relative h-full w-1 grow overflow-hidden rounded-full bg-white/20">
                <Slider.Range className="absolute w-full bg-white" />
              </Slider.Track>
              <Slider.Thumb
                aria-label="Volume"
                className="block size-3 rounded-full bg-white shadow focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
              />
            </Slider.Root>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}

function CurrentTime() {
  const time = usePlayer(selectTime);
  if (!time) return null;

  return <time className={TIME_CLASS}>{formatTime(time.currentTime)}</time>;
}

/** Remaining time that toggles to duration on click, worded like `Time.Value type="remaining" toggle`. */
function RemainingTime() {
  const time = usePlayer(selectTime);
  const [remaining, setRemaining] = useState(true);
  const t = useTranslator();

  if (!time) return null;

  const shown = remaining ? `-${formatTime(time.duration - time.currentTime)}` : formatTime(time.duration);

  return (
    <button
      type="button"
      className={`${TIME_CLASS} cursor-pointer`}
      aria-label={t(remaining ? showDurationText : showRemainingText, { duration: shown })}
      onClick={() => setRemaining((current) => !current)}
    >
      <time>{shown}</time>
    </button>
  );
}

/** Radix Icons has no closed-caption glyph; the speech bubble serves the button and the menu, pressed = showing. */
function CaptionsToggle() {
  const textTrack = usePlayer(selectTextTrack);
  const hasTracks = textTrack?.textTrackList.some((track) => track.kind === 'subtitles' || track.kind === 'captions');
  const t = useTranslator();

  if (!textTrack || !hasTracks) return null;

  const label = t(textTrack.subtitlesShowing ? captionsDisableText : captionsEnableText);

  return (
    <HotkeyTooltip label={label} action="toggleSubtitles">
      <Toggle.Root
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        pressed={textTrack.subtitlesShowing}
        onPressedChange={() => textTrack.toggleSubtitles()}
      >
        <ChatBubbleIcon />
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

interface OptionSubmenuProps {
  icon: ReactNode;
  /** The default skin's menu wording, so both players read the same. */
  label: string;
  options: {
    value: string;
    selectedLabel: string;
    options: readonly { value: string; label: ReactNode; disabled: boolean }[];
    setValue: (value: string) => void;
    hidden: boolean;
  } | null;
}

/** One Radix submenu per Video.js option hook, like the default skin's settings submenus; `hidden` gates it. */
function OptionSubmenu({ icon, label, options }: OptionSubmenuProps) {
  const container = useContainer();

  if (!options || options.hidden || options.options.length === 0) return null;

  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className={MENU_TRIGGER_ITEM_CLASS}>
        <span className="[&_svg]:size-4">{icon}</span>
        {label}
        <span className={MENU_HINT_CLASS}>
          {options.selectedLabel}
          <ChevronRightIcon />
        </span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.SubContent sideOffset={6} className={`${POPUP_CLASS} min-w-44`}>
          <DropdownMenu.RadioGroup value={options.value} onValueChange={options.setValue}>
            {options.options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={MENU_ITEM_CLASS}
              >
                <DropdownMenu.ItemIndicator className="absolute left-2 flex size-4 items-center justify-center">
                  <CheckIcon />
                </DropdownMenu.ItemIndicator>
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}

/**
 * Settings menu with the default skin's four submenus and wording. Icons: sliders for quality (the skin uses switches),
 * a globe for audio language (the skin uses a speech glyph), a stopwatch for speed (the skin uses a speedometer).
 */
function SettingsMenu() {
  const container = useContainer();
  const quality = useQualityOptions();
  const audio = useAudioTrackOptions();
  const rates = usePlaybackRateOptions();
  const captions = useCaptionsOptions();
  const t = useTranslator();

  return (
    <DropdownMenu.Root modal={false}>
      <HotkeyTooltip label={t(settingsText)}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={ICON_BUTTON_CLASS} aria-label={t(settingsText)}>
            <GearIcon />
          </button>
        </DropdownMenu.Trigger>
      </HotkeyTooltip>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content side="top" align="end" sideOffset={8} className={`${POPUP_CLASS} min-w-56`}>
          <OptionSubmenu icon={<MixerHorizontalIcon />} label={t(qualityText)} options={quality} />
          <OptionSubmenu icon={<GlobeIcon />} label={t(audioText)} options={audio} />
          <OptionSubmenu icon={<StopwatchIcon />} label={t(speedText)} options={rates} />
          <OptionSubmenu icon={<ChatBubbleIcon />} label={t(captionsText)} options={captions} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * One remote-playback button for the skin's Cast/AirPlay pair, worded as AirPlay because the remote-playback feature is
 * what drives Video.js's AirPlayButton; hidden when unsupported, disabled when unavailable.
 */
function RemotePlaybackToggle() {
  const remote = usePlayer(selectRemotePlayback);
  const t = useTranslator();

  if (!remote || remote.remotePlaybackAvailability === 'unsupported') return null;

  const connected = remote.remotePlaybackState === 'connected';
  const label = t(connected ? airplayStopText : airplayStartText);

  return (
    <HotkeyTooltip label={label}>
      <Toggle.Root
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        pressed={connected}
        disabled={remote.remotePlaybackAvailability === 'unavailable'}
        onPressedChange={() => void remote.toggleRemotePlayback()}
      >
        <DesktopIcon />
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

/** Radix Icons has no picture-in-picture glyph; CopyIcon's overlapping frames are the nearest, pressed = in PiP. */
function PiPToggle() {
  const pip = usePlayer(selectPiP);
  const t = useTranslator();

  if (!pip || pip.pipAvailability === 'unsupported') return null;

  const label = t(pip.pip ? pipExitText : pipEnterText);

  return (
    <HotkeyTooltip label={label} action="togglePictureInPicture">
      <Toggle.Root
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        pressed={pip.pip}
        disabled={pip.pipAvailability === 'unavailable'}
        onPressedChange={() => void pip.togglePictureInPicture()}
      >
        <CopyIcon />
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

function FullscreenToggle() {
  const fullscreen = usePlayer(selectFullscreen);
  const t = useTranslator();

  if (!fullscreen || fullscreen.fullscreenAvailability === 'unsupported') return null;

  const label = t(fullscreen.fullscreen ? fullscreenExitText : fullscreenEnterText);

  return (
    <HotkeyTooltip label={label} action="toggleFullscreen">
      <Toggle.Root
        className={ICON_BUTTON_CLASS}
        aria-label={label}
        pressed={fullscreen.fullscreen}
        onPressedChange={() => void fullscreen.toggleFullscreen()}
      >
        {fullscreen.fullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

export function HooksApproachControls() {
  const controls = usePlayer(selectControls);
  const visible = controls?.controlsVisible ?? true;
  const hidden = visible ? '' : BAR_HIDDEN_CLASS;

  return (
    <>
      <PosterOverlay />
      <BufferingSpinner />
      <ErrorAlert />
      <div className={`${BACKDROP_CLASS} ${visible ? '' : 'opacity-0'}`} />
      <Tooltip.Provider delayDuration={300}>
        {/* `data-interactive` is what the container's tap/double-tap gestures skip, as Video.js's Controls.Content sets. */}
        <div className={`${BAR_CLASS} ${hidden}`} data-visible={visible || undefined} data-interactive="">
          <PlayToggle />
          <VolumeControl />
          <div className={TIME_GROUP_CLASS}>
            <CurrentTime />
            <SeekSlider />
            <RemainingTime />
          </div>
          <CaptionsToggle />
          <SettingsMenu />
          <div className={SECONDARY_GROUP_CLASS}>
            <RemotePlaybackToggle />
            <PiPToggle />
            <FullscreenToggle />
          </div>
        </div>
      </Tooltip.Provider>
      <PlayerBehaviors />
    </>
  );
}
