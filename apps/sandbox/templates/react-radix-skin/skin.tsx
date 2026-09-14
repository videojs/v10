// A Video.js player skin built from Radix Primitives and Radix Icons. Radix renders and handles interaction; Video.js
// supplies state and actions through `usePlayer(selector)`, availability flags, the option hooks, the text-track
// feature's chapter and thumbnail cues, and its i18n text tokens so the wording matches the default skin. The site
// guide "Use Video.js with Radix UI" walks through the same code step by step.

import {
  ChatBubbleIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  DesktopIcon,
  EnterFullScreenIcon,
  ExitFullScreenIcon,
  ExitIcon,
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
import {
  getErrorDialogDismissText,
  getErrorDialogTitleText,
  mapCuesToThumbnails,
  normalizeChapterCues,
  resolveErrorDialogDescription,
  ThumbnailCore,
} from '@videojs/core';
import { translateText } from '@videojs/core/i18n';
import { startText as airplayStartText, stopText as airplayStopText } from '@videojs/core/i18n/text/airplay';
import { muteText, pauseText, playText, replayText, unmuteText } from '@videojs/core/i18n/text/buttons';
import { disableText as captionsDisableText, enableText as captionsEnableText } from '@videojs/core/i18n/text/captions';
import { enterText as fullscreenEnterText, exitText as fullscreenExitText } from '@videojs/core/i18n/text/fullscreen';
import { audioText, captionsText, qualityText, settingsText, speedText } from '@videojs/core/i18n/text/menu';
import { enterText as pipEnterText, exitText as pipExitText } from '@videojs/core/i18n/text/pip';
import { showDurationText, showRemainingText } from '@videojs/core/i18n/text/time';
import {
  Gesture,
  Hotkey,
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
import { formatTime } from '@videojs/utils/time';
import { Dialog, DropdownMenu, Popover, Slider, Toggle, Tooltip } from 'radix-ui';
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

/** The default skin's controls gradient, painted over the whole container behind the bar. */
const BACKDROP_CLASS =
  'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 via-25% to-transparent transition-opacity duration-300';
/** The default skin's pill bar. */
const BAR_CLASS =
  'absolute inset-x-3 bottom-3 flex h-11 items-center rounded-full bg-white/10 p-1 text-white backdrop-blur-[16px] backdrop-saturate-150 transition-opacity duration-300';
const BAR_HIDDEN_CLASS = 'opacity-0 pointer-events-none';
/** Current time, slider, remaining time. */
const TIME_GROUP_CLASS = 'flex grow items-center gap-2.5 px-3';
const SECONDARY_GROUP_CLASS = 'flex items-center gap-px';
const TIME_CLASS = 'text-[13px] tabular-nums';
/** A 36px round icon button; Radix ships no styles. */
const ICON_BUTTON_CLASS =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[state=open]:bg-white/15 [&_svg]:size-[18px]';
const TEXT_BUTTON_CLASS =
  'inline-flex h-8 cursor-pointer items-center rounded-full bg-white/15 px-3 text-sm font-medium text-white outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60';
const POPUP_CLASS =
  'z-50 rounded-xl border border-white/10 bg-neutral-900/90 p-1 text-[13px] text-white shadow-xl outline-none backdrop-blur-[16px] backdrop-saturate-150';
const MENU_ITEM_CLASS =
  'relative flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-3 pl-8 outline-none select-none data-[highlighted]:bg-white/15 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';
const MENU_TRIGGER_ITEM_CLASS =
  'relative flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-2 pl-3 outline-none select-none data-[highlighted]:bg-white/15 data-[state=open]:bg-white/15';
const MENU_HINT_CLASS = 'ml-auto flex items-center gap-1 pl-4 text-white/60';
const TOOLTIP_CLASS = 'z-50 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-900 shadow-md';
const OVERLAY_CLASS = 'pointer-events-none absolute inset-0 flex items-center justify-center';
const DIALOG_CLASS =
  'absolute inset-0 z-50 m-auto flex h-fit max-w-sm flex-col gap-3 rounded-xl border border-white/10 bg-neutral-900 p-5 text-white shadow-2xl outline-none';

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

/**
 * Radix Icons has one glyph for captions and remote playback, so the "on" state gets a short underline beneath the
 * icon, the way YouTube marks captions. Where Radix has a paired glyph (fullscreen, PiP, speaker levels) the icon
 * swaps.
 */
function ActiveIcon({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span
      className={`relative inline-flex ${
        on
          ? 'after:absolute after:-bottom-1.5 after:left-1/2 after:h-0.5 after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-white'
          : 'opacity-80'
      }`}
    >
      {children}
    </span>
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

/**
 * Error dialog driven by the error feature, scoped to the player like Video.js's `ErrorDialog`. Radix `AlertDialog` is
 * always page-modal (it hides and blocks everything outside), so this is a non-modal `Dialog` with `role="alertdialog"`
 * whose outside interactions are ignored; its backdrop is our own, since Radix renders `Overlay` only when modal.
 * Title, description, and dismiss label come from the same text helpers Video.js's dialog uses.
 */
function ErrorAlert() {
  const error = usePlayer(selectError);
  const container = useContainer();
  const t = useTranslator();

  if (!error) return null;

  const open = error.error !== null;

  return (
    <Dialog.Root modal={false} open={open} onOpenChange={(next) => !next && error.dismissError()}>
      <Dialog.Portal container={container}>
        {open ? <div className="absolute inset-0 z-50 bg-black/60" /> : null}
        <Dialog.Content
          role="alertdialog"
          data-interactive=""
          onInteractOutside={(event) => event.preventDefault()}
          className={DIALOG_CLASS}
        >
          <Dialog.Title className="text-base font-semibold">{translateText(getErrorDialogTitleText(), t)}</Dialog.Title>
          <Dialog.Description className="text-sm text-white/80">
            {translateText(resolveErrorDialogDescription(error.error), t)}
          </Dialog.Description>
          <div className="flex justify-end">
            <Dialog.Close className={TEXT_BUTTON_CLASS}>{translateText(getErrorDialogDismissText(), t)}</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
/** Transparent gap between chapter track segments, as in the default skin. */
const CHAPTER_GAP = 4;
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
  const thumbnail = hoverTime === null ? undefined : thumbnailCore.findActiveThumbnail(thumbnails, hoverTime);
  const thumbnailScale = thumbnail?.width ? PREVIEW_WIDTH / thumbnail.width : 1;

  // The core's partition of the timeline: one segment per chapter cue plus fillers for any gaps, so the track is
  // contiguous whatever the cues cover. The hovered segment supplies the chapter title.
  const segments = normalizeChapterCues(textTrack?.chaptersCues ?? [], 0, duration);
  const hoveredSegment =
    hoverTime === null ? undefined : segments.find((segment) => hoverTime >= segment.start && hoverTime < segment.end);
  const chapterTitle = hoveredSegment?.cue?.text;

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
      {/* Radix's Track is the pointer surface; the visible track is drawn per chapter so the 4px gaps stay transparent. */}
      <Slider.Track className="relative flex h-1 w-full grow items-center">
        {segments.map(({ key, start, end }, index) => {
          const isFirst = index === 0;
          const isLast = index === segments.length - 1;
          const span = end - start;
          const highlighted = hoveredSegment?.key === key;
          const fraction = (t: number) => `${Math.min(1, Math.max(0, (t - start) / span)) * 100}%`;

          return (
            <div
              key={key}
              className={`absolute overflow-hidden rounded-full bg-white/20 transition-[height] duration-300 ${highlighted ? 'h-[7px]' : 'h-1'}`}
              style={{
                left: `calc(${(start / duration) * 100}% + ${isFirst ? 0 : CHAPTER_GAP / 2}px)`,
                width: `calc(${(span / duration) * 100}% - ${(isFirst ? 0 : CHAPTER_GAP / 2) + (isLast ? 0 : CHAPTER_GAP / 2)}px)`,
              }}
            >
              <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: fraction(bufferedEnd) }} />
              <div className="absolute inset-y-0 left-0 bg-white" style={{ width: fraction(value) }} />
            </div>
          );
        })}
      </Slider.Track>
      <Slider.Thumb
        aria-label="Seek"
        aria-valuetext={formatTime(value, duration)}
        className="block size-3 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none data-[state=active]:opacity-100"
      />
      {hoverTime !== null ? (
        <div
          className="pointer-events-none absolute bottom-0 -translate-x-1/2"
          style={{
            left: `clamp(${PREVIEW_WIDTH / 2}px, ${hover! * 100}%, calc(100% - ${PREVIEW_WIDTH / 2}px))`,
            width: PREVIEW_WIDTH,
          }}
        >
          {/* Thumbnail sits 36px above the track; the label sits 42px above it, over the thumbnail's bottom gradient. */}
          {thumbnail?.width && thumbnail.height ? (
            <div
              className="absolute bottom-9 left-0 overflow-hidden rounded-xl bg-black/90 shadow-lg after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-t after:from-black/50 after:via-black/10 after:to-transparent"
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
          <div className="absolute bottom-[42px] left-0 flex w-full flex-col items-center text-[13px] text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
            {chapterTitle ? <span className="w-full truncate px-3 text-center">{chapterTitle}</span> : null}
            <span className="tabular-nums">{formatTime(hoverTime, duration)}</span>
          </div>
        </div>
      ) : null}
    </Slider.Root>
  );
}

/**
 * Hover-open state that survives the pointer crossing the gap between a trigger and its portaled content: leaving
 * either side starts a short timer that entering the other side cancels.
 */
function useHoverOpen(closeDelay = 150) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);

    timer.current = null;
  };

  const onPointerEnter = () => {
    cancel();
    setOpen(true);
  };

  const onPointerLeave = () => {
    cancel();
    timer.current = setTimeout(() => setOpen(false), closeDelay);
  };

  useEffect(() => cancel, []);

  return { open, setOpen, hoverProps: { onPointerEnter, onPointerLeave } };
}

/**
 * Mute toggle with a hover volume popover. No tooltip here: the popover is what hover shows, as in the default skin.
 * Radix Popover has no hover-open, so it is controlled from pointer enter/leave on the trigger wrapper and the
 * content.
 */
function VolumeControl() {
  const volume = usePlayer(selectVolume);
  const container = useContainer();
  const { open, setOpen, hoverProps } = useHoverOpen();
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
    <span {...hoverProps} className="inline-flex">
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
            {...hoverProps}
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

  return <time className={TIME_CLASS}>{formatTime(time.currentTime, time.duration)}</time>;
}

/** Remaining time that toggles to duration on click, worded like `Time.Value type="remaining" toggle`. */
function RemainingTime() {
  const time = usePlayer(selectTime);
  const [remaining, setRemaining] = useState(true);
  const t = useTranslator();

  if (!time) return null;

  const shown = remaining
    ? `-${formatTime(time.duration - time.currentTime, time.duration)}`
    : formatTime(time.duration);

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

/** Radix Icons has no closed-caption glyph; the speech bubble serves the button and the menu, underlined while showing. */
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
        <ActiveIcon on={textTrack.subtitlesShowing}>
          <ChatBubbleIcon />
        </ActiveIcon>
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
        <ActiveIcon on={connected}>
          <DesktopIcon />
        </ActiveIcon>
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

/**
 * Radix Icons has no picture-in-picture glyph; overlapping frames (CopyIcon) enter it, an arrow leaving a frame
 * (ExitIcon) exits.
 */
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
        {pip.pip ? <ExitIcon /> : <CopyIcon />}
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

export function RadixSkin() {
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

/** The default video skin's hotkeys and gestures. Both render nothing; they bind to the player container. */
function PlayerBehaviors() {
  return (
    <>
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="ArrowRight" action="seekStep" />
      <Hotkey keys="ArrowLeft" action="seekStep" />
      <Hotkey keys="l" action="seekStep" />
      <Hotkey keys="j" action="seekStep" />
      <Hotkey keys="ArrowUp" action="volumeStep" />
      <Hotkey keys="ArrowDown" action="volumeStep" />
      <Hotkey keys="0-9" action="seekToPercent" />
      <Hotkey keys="Home" action="seekToPercent" value={0} />
      <Hotkey keys="End" action="seekToPercent" value={100} />
      <Hotkey keys=">" action="speedUp" />
      <Hotkey keys="<" action="speedDown" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="c" action="toggleSubtitles" />
      <Hotkey keys="i" action="togglePictureInPicture" />
      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="seekStep" region="left" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />
      <Gesture type="doubletap" action="seekStep" region="right" />
    </>
  );
}
