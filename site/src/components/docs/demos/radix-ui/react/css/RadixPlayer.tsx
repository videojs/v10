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
import { startText as airplayStartText, stopText as airplayStopText } from '@videojs/core/i18n/text/airplay';
import { muteText, pauseText, playText, replayText, unmuteText } from '@videojs/core/i18n/text/buttons';
import { disableText as captionsDisableText, enableText as captionsEnableText } from '@videojs/core/i18n/text/captions';
import { enterText as fullscreenEnterText, exitText as fullscreenExitText } from '@videojs/core/i18n/text/fullscreen';
import { audioText, captionsText, qualityText, settingsText, speedText } from '@videojs/core/i18n/text/menu';
import { enterText as pipEnterText, exitText as pipExitText } from '@videojs/core/i18n/text/pip';
import { showDurationText, showRemainingText } from '@videojs/core/i18n/text/time';
import {
  Container,
  Gesture,
  Hotkey,
  selectBuffer,
  selectControls,
  selectError,
  selectFullscreen,
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
import { isText, useTranslator } from '@videojs/react/i18n';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { VideoPlayer } from '@videojs/react/video';
import { formatTime } from '@videojs/utils/time';
import { Dialog, DropdownMenu, Popover, Slider, Toggle, Tooltip } from 'radix-ui';
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

// Tooltip with the hotkey hint the default skin shows. Portal into the container so it follows the player into fullscreen.
function HotkeyTooltip({ label, action, children }: { label: string; action?: string; children: ReactElement }) {
  const container = useContainer();
  const shortcut = useHotkeyShortcut(action);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={container}>
        <Tooltip.Content className="radix-player__tooltip" side="top" sideOffset={8}>
          {label}
          {shortcut.shortcut ? <kbd className="radix-player__tooltip-key">{shortcut.shortcut}</kbd> : null}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// Radix Icons has one glyph for captions and remote playback, so the "on" state is an underline under the icon.
function ActiveIcon({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className="radix-player__icon" data-on={on || undefined}>
      {children}
    </span>
  );
}

function PlayToggle() {
  const playback = usePlayer(selectPlayback);
  const t = useTranslator();

  if (!playback) return null;

  const label = t(playback.ended ? replayText : playback.paused ? playText : pauseText);

  return (
    <HotkeyTooltip label={label} action="togglePaused">
      <button type="button" className="radix-player__button" aria-label={label} onClick={() => playback.togglePaused()}>
        {playback.ended ? <ReloadIcon /> : playback.paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </HotkeyTooltip>
  );
}

// Hover-open state that survives the pointer crossing the gap between the trigger and the portaled popover.
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

// Mute toggle whose hover opens a volume popover. Radix Popover has no hover-open, so the open state is controlled.
function VolumeControl() {
  const volume = usePlayer(selectVolume);
  const container = useContainer();
  const { open, setOpen, hoverProps } = useHoverOpen();
  const t = useTranslator();

  if (!volume || volume.mutedAvailability === 'unsupported') return null;

  const level = volume.muted ? 0 : volume.volume;
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
    <span className="radix-player__volume-anchor" {...hoverProps}>
      <Popover.Root open={open && volume.volumeAvailability === 'available'} onOpenChange={setOpen}>
        <Popover.Anchor asChild>
          <Toggle.Root
            className="radix-player__button"
            aria-label={label}
            pressed={volume.muted}
            onPressedChange={() => volume.toggleMuted()}
          >
            <Icon />
          </Toggle.Root>
        </Popover.Anchor>
        <Popover.Portal container={container}>
          <Popover.Content
            className="radix-player__popover"
            side="top"
            sideOffset={8}
            onOpenAutoFocus={(event) => event.preventDefault()}
            data-interactive=""
            {...hoverProps}
          >
            <Slider.Root
              className="radix-player__volume"
              orientation="vertical"
              min={0}
              max={1}
              step={0.05}
              value={[volume.muted ? 0 : volume.volume]}
              onValueChange={([next]) => {
                if (next !== undefined) volume.setVolume(next);
              }}
            >
              <Slider.Track className="radix-player__volume-track">
                <Slider.Range className="radix-player__volume-range" />
              </Slider.Track>
              <Slider.Thumb className="radix-player__thumb radix-player__thumb--always" aria-label="Volume" />
            </Slider.Root>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}

const PREVIEW_WIDTH = 160;
const CHAPTER_GAP = 4;
const thumbnailCore = new ThumbnailCore();

// Radix Slider fed by the time, buffer, and text-track features. Radix exposes no pointer position, so hover time comes
// from the root's rect; the chapter title and storyboard tile are derived from it with the core's helpers.
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

  // One track segment per chapter plus fillers for gaps between cues, so the track is always contiguous.
  const segments = normalizeChapterCues(textTrack?.chaptersCues ?? [], 0, duration);
  const hovered =
    hoverTime === null ? undefined : segments.find((segment) => hoverTime >= segment.start && hoverTime < segment.end);

  return (
    <Slider.Root
      className="radix-player__slider"
      min={0}
      max={duration}
      step={0.1}
      value={[value]}
      onValueChange={([next]) => setDragValue(next ?? null)}
      onValueCommit={([next]) => {
        setDragValue(null);

        if (next !== undefined) time.seek(next);
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();

        setHover(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
      }}
      onPointerLeave={() => setHover(null)}
    >
      <Slider.Track className="radix-player__track">
        {segments.map(({ key, start, end }, index) => {
          const isFirst = index === 0;
          const isLast = index === segments.length - 1;
          const span = end - start;
          const fraction = (value: number) => `${Math.min(1, Math.max(0, (value - start) / span)) * 100}%`;
          const inset = (isFirst ? 0 : CHAPTER_GAP / 2) + (isLast ? 0 : CHAPTER_GAP / 2);

          return (
            <div
              key={key}
              className="radix-player__segment"
              data-highlighted={hovered?.key === key || undefined}
              style={{
                left: `calc(${(start / duration) * 100}% + ${isFirst ? 0 : CHAPTER_GAP / 2}px)`,
                width: `calc(${(span / duration) * 100}% - ${inset}px)`,
              }}
            >
              <div className="radix-player__buffer" style={{ width: fraction(bufferedEnd) }} />
              <div className="radix-player__fill" style={{ width: fraction(value) }} />
            </div>
          );
        })}
      </Slider.Track>
      <Slider.Thumb className="radix-player__thumb" aria-label="Seek" aria-valuetext={formatTime(value, duration)} />
      {hoverTime !== null ? (
        <div
          className="radix-player__preview"
          style={{
            left: `clamp(${PREVIEW_WIDTH / 2}px, ${hover! * 100}%, calc(100% - ${PREVIEW_WIDTH / 2}px))`,
            width: PREVIEW_WIDTH,
          }}
        >
          {thumbnail?.width && thumbnail.height ? (
            <div className="radix-player__thumbnail" style={{ height: thumbnail.height * thumbnailScale }}>
              <img
                alt=""
                src={thumbnail.url}
                style={{
                  transform: `scale(${thumbnailScale}) translate(-${thumbnail.coords?.x ?? 0}px, -${thumbnail.coords?.y ?? 0}px)`,
                }}
              />
            </div>
          ) : null}
          <div className="radix-player__preview-label">
            {hovered?.cue ? <span className="radix-player__preview-chapter">{hovered.cue.text}</span> : null}
            <span>{formatTime(hoverTime, duration)}</span>
          </div>
        </div>
      ) : null}
    </Slider.Root>
  );
}

function CurrentTime() {
  const time = usePlayer(selectTime);
  if (!time) return null;

  return <span className="radix-player__time">{formatTime(time.currentTime, time.duration)}</span>;
}

// Remaining time that toggles to the duration on click, worded like the default skin's time display.
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
      className="radix-player__time radix-player__time--button"
      aria-label={t(remaining ? showDurationText : showRemainingText, { duration: shown })}
      onClick={() => setRemaining((current) => !current)}
    >
      {shown}
    </button>
  );
}

function CaptionsToggle() {
  const textTrack = usePlayer(selectTextTrack);
  const t = useTranslator();
  const hasTracks = textTrack?.textTrackList.some((track) => track.kind === 'subtitles' || track.kind === 'captions');
  if (!textTrack || !hasTracks) return null;

  const label = t(textTrack.subtitlesShowing ? captionsDisableText : captionsEnableText);

  return (
    <HotkeyTooltip label={label} action="toggleSubtitles">
      <Toggle.Root
        className="radix-player__button"
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

type Options = ReturnType<typeof useQualityOptions>;

function OptionSubmenu({ icon, label, options }: { icon: ReactNode; label: string; options: Options }) {
  const container = useContainer();

  if (!options || options.hidden) return null;

  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className="radix-player__menu-item radix-player__menu-item--trigger">
        {icon}
        {label}
        <span className="radix-player__menu-hint">
          {options.selectedLabel}
          <ChevronRightIcon />
        </span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.SubContent className="radix-player__menu" sideOffset={6}>
          <DropdownMenu.RadioGroup value={options.value} onValueChange={options.setValue}>
            {options.options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="radix-player__menu-item radix-player__menu-item--radio"
              >
                <DropdownMenu.ItemIndicator className="radix-player__menu-check">
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
          <button type="button" className="radix-player__button" aria-label={t(settingsText)}>
            <GearIcon />
          </button>
        </DropdownMenu.Trigger>
      </HotkeyTooltip>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content className="radix-player__menu" side="top" align="end" sideOffset={8}>
          <OptionSubmenu icon={<MixerHorizontalIcon />} label={t(qualityText)} options={quality} />
          <OptionSubmenu icon={<GlobeIcon />} label={t(audioText)} options={audio} />
          <OptionSubmenu icon={<StopwatchIcon />} label={t(speedText)} options={rates} />
          <OptionSubmenu icon={<ChatBubbleIcon />} label={t(captionsText)} options={captions} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Hidden where the platform has no remote playback, disabled while no receiver is reachable.
function RemotePlaybackToggle() {
  const remote = usePlayer(selectRemotePlayback);
  const t = useTranslator();

  if (!remote || remote.remotePlaybackAvailability === 'unsupported') return null;

  const connected = remote.remotePlaybackState === 'connected';
  const label = t(connected ? airplayStopText : airplayStartText);

  return (
    <HotkeyTooltip label={label}>
      <Toggle.Root
        className="radix-player__button"
        aria-label={label}
        pressed={connected}
        disabled={remote.remotePlaybackAvailability === 'unavailable'}
        onPressedChange={() => remote.toggleRemotePlayback()}
      >
        <ActiveIcon on={connected}>
          <DesktopIcon />
        </ActiveIcon>
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

function PiPToggle() {
  const pip = usePlayer(selectPiP);
  const t = useTranslator();

  if (!pip || pip.pipAvailability === 'unsupported') return null;

  const label = t(pip.pip ? pipExitText : pipEnterText);

  return (
    <HotkeyTooltip label={label} action="togglePictureInPicture">
      <Toggle.Root
        className="radix-player__button"
        aria-label={label}
        pressed={pip.pip}
        disabled={pip.pipAvailability === 'unavailable'}
        onPressedChange={() => pip.togglePictureInPicture()}
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
        className="radix-player__button"
        aria-label={label}
        pressed={fullscreen.fullscreen}
        onPressedChange={() => fullscreen.toggleFullscreen()}
      >
        {fullscreen.fullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
      </Toggle.Root>
    </HotkeyTooltip>
  );
}

function BufferingSpinner() {
  const playback = usePlayer(selectPlayback);
  if (!playback?.waiting) return null;

  return (
    <div className="radix-player__spinner">
      <UpdateIcon />
    </div>
  );
}

// Radix AlertDialog is always page-modal, so this is a non-modal Dialog with role="alertdialog" that ignores outside
// interaction and paints its own scrim over the player only. The copy comes from the player's error-dialog texts.
function ErrorAlert() {
  const error = usePlayer(selectError);
  const container = useContainer();
  const t = useTranslator();

  if (!error) return null;

  const open = error.error !== null;
  const description = resolveErrorDialogDescription(error.error);

  return (
    <Dialog.Root modal={false} open={open} onOpenChange={(next) => !next && error.dismissError()}>
      <Dialog.Portal container={container}>
        {open ? <div className="radix-player__scrim" /> : null}
        <Dialog.Content
          className="radix-player__dialog"
          role="alertdialog"
          data-interactive=""
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="radix-player__dialog-title">{t(getErrorDialogTitleText())}</Dialog.Title>
          <Dialog.Description className="radix-player__dialog-description">
            {isText(description) ? t(description) : description}
          </Dialog.Description>
          <div className="radix-player__dialog-actions">
            <Dialog.Close className="radix-player__text-button">{t(getErrorDialogDismissText())}</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// The default skin's keyboard shortcuts and click-to-toggle gesture; both are state-only Video.js components.
function Behaviors() {
  return (
    <>
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="ArrowRight" action="seekStep" />
      <Hotkey keys="ArrowLeft" action="seekStep" />
      <Hotkey keys="ArrowUp" action="volumeStep" />
      <Hotkey keys="ArrowDown" action="volumeStep" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="c" action="toggleSubtitles" />
      <Hotkey keys="i" action="togglePictureInPicture" />
      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />
    </>
  );
}

function Controls() {
  const controls = usePlayer(selectControls);
  const hidden = controls ? !controls.controlsVisible : false;

  return (
    <>
      <BufferingSpinner />
      <ErrorAlert />
      <div className="radix-player__backdrop" data-hidden={hidden || undefined} />
      <Tooltip.Provider delayDuration={300}>
        {/* `data-interactive` tells the container's gestures to ignore clicks inside the bar. */}
        <div className="radix-player__bar" data-hidden={hidden || undefined} data-interactive="">
          <PlayToggle />
          <VolumeControl />
          <div className="radix-player__time-group">
            <CurrentTime />
            <SeekSlider />
            <RemainingTime />
          </div>
          <CaptionsToggle />
          <SettingsMenu />
          <div className="radix-player__group">
            <RemotePlaybackToggle />
            <PiPToggle />
            <FullscreenToggle />
          </div>
        </div>
      </Tooltip.Provider>
      <Behaviors />
    </>
  );
}

export default function RadixPlayer() {
  return (
    <VideoPlayer>
      <Container className="radix-player">
        <HlsJsVideo
          src="{{VJS10_DEMO_VIDEO_HLS}}"
          poster="{{VJS10_DEMO_POSTER}}"
          preload="metadata"
          muted
          playsInline
          crossOrigin="anonymous"
        >
          <track kind="metadata" label="thumbnails" src="{{VJS10_DEMO_STORYBOARD_VTT}}" default />
          <track kind="chapters" src="/docs/demos/time-slider/chapters.vtt" srcLang="en" default />
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
        </HlsJsVideo>
        <Controls />
      </Container>
    </VideoPlayer>
  );
}
