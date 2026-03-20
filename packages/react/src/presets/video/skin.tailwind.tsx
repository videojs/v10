import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/react';
import {
  bufferingIndicator,
  button,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  overlay,
  playbackRate,
  popup,
  poster,
  preview,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/default/tailwind/video.tailwind';
import { isString } from '@videojs/utils/predicate';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { Container, usePlayer } from '@/player/context';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { CaptionsButton } from '@/ui/captions-button';
import { Controls } from '@/ui/controls';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { PlaybackRateButton } from '@/ui/playback-rate-button';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { SeekButton } from '@/ui/seek-button';
import { Slider } from '@/ui/slider';
import { Time } from '@/ui/time';
import { TimeSlider } from '@/ui/time-slider';
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';
import { isRenderProp } from '@/utils/use-render';
import { ErrorDialog } from '../error-dialog';
import type { VideoSkinProps } from './skin';

const SEEK_TIME = 10;

const ERROR_CLASSNAMES = {
  root: error.root,
  dialog: error.dialog,
  content: error.content,
  title: error.title,
  description: error.description,
  actions: error.actions,
  close: cn(button.base, button.primary),
};

/* --------------------------------------- Components ---------------------------------------- */

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button ref={ref} type="button" className={cn(button.base, button.subtle, button.icon, className)} {...props} />
  );
});

const SliderRoot = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderRoot({ className, ...props }, ref) {
  return <div ref={ref} className={cn(slider.root, className)} {...props} />;
});

const SliderTrack = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderTrack(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn(slider.track, className)} {...props} />;
});

const SliderFill = forwardRef<HTMLDivElement, ComponentProps<'div'> & { type?: 'fill' | 'buffer' }>(function SliderFill(
  { type = 'fill', className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(slider.fill.base, type === 'fill' ? slider.fill.fill : slider.fill.buffer, className)}
      {...props}
    />
  );
});

const SliderBuffer = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderBuffer(props, ref) {
  return <SliderFill type="buffer" ref={ref} {...props} />;
});

const SliderThumb = forwardRef<HTMLDivElement, ComponentProps<'div'> & { persistent?: boolean }>(function SliderThumb(
  { persistent, className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(slider.thumb.base, persistent ? slider.thumb.persistent : slider.thumb.interactive, className)}
      {...props}
    />
  );
});

function PlayLabel(): string {
  const paused = usePlayer((s) => Boolean(s.paused));
  const ended = usePlayer((s) => Boolean(s.ended));
  if (ended) return 'Replay';
  return paused ? 'Play' : 'Pause';
}

function CaptionsLabel(): string {
  const active = usePlayer((s) => Boolean(s.subtitlesShowing));
  return active ? 'Disable captions' : 'Enable captions';
}

function PiPLabel(): string {
  const pip = usePlayer((s) => Boolean(s.pip));
  return pip ? 'Exit picture-in-picture' : 'Enter picture-in-picture';
}

function FullscreenLabel(): string {
  const fullscreen = usePlayer((s) => Boolean(s.fullscreen));
  return fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
}

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className={iconState.mute.button} render={<Button />}>
      <VolumeOffIcon className={cn(icon, iconState.mute.volumeOff)} />
      <VolumeLowIcon className={cn(icon, iconState.mute.volumeLow)} />
      <VolumeHighIcon className={cn(icon, iconState.mute.volumeHigh)} />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className={cn(popup.popover, popup.volume)}>
        <VolumeSlider.Root orientation="vertical" thumbAlignment="edge" render={<SliderRoot />}>
          <VolumeSlider.Track render={<SliderTrack />}>
            <VolumeSlider.Fill render={<SliderFill />} />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb render={(props) => <SliderThumb persistent {...props} />} />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

/* ------------------------------------------ Skin ------------------------------------------- */

export function VideoSkinTailwind(props: VideoSkinProps): ReactNode {
  const { children, className, poster: posterProp, ...rest } = props;

  return (
    <Container className={cn(root(false), className)} {...rest}>
      {children}

      {posterProp && (
        <Poster
          src={isString(posterProp) ? posterProp : undefined}
          render={isRenderProp(posterProp) ? posterProp : undefined}
          className={poster(false)}
        />
      )}

      <BufferingIndicator
        render={(props) => (
          <div {...props} className={bufferingIndicator.root}>
            <div className={bufferingIndicator.container}>
              <SpinnerIcon className={icon} />
            </div>
          </div>
        )}
      />

      <ErrorDialog classNames={ERROR_CLASSNAMES} />

      <Controls.Root
        data-controls="" // Used as a hook for Tailwind has-[] styles
        className={controls}
      >
        <Tooltip.Provider>
          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PlayButton className={iconState.play.button} render={<Button />}>
                  <RestartIcon className={cn(icon, iconState.play.restart)} />
                  <PlayIcon className={cn(icon, iconState.play.play)} />
                  <PauseIcon className={cn(icon, iconState.play.pause)} />
                </PlayButton>
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>
              <PlayLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <SeekButton seconds={-SEEK_TIME} className={seek.button} render={<Button />}>
                  <span className={iconContainer}>
                    <SeekIcon className={cn(icon, iconFlipped)} />
                    <span className={cn(seek.label, seek.labelBackward)}>{SEEK_TIME}</span>
                  </span>
                </SeekButton>
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <SeekButton seconds={SEEK_TIME} className={seek.button} render={<Button />}>
                  <span className={iconContainer}>
                    <SeekIcon className={icon} />
                    <span className={cn(seek.label, seek.labelForward)}>{SEEK_TIME}</span>
                  </span>
                </SeekButton>
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>Seek forward {SEEK_TIME} seconds</Tooltip.Popup>
          </Tooltip.Root>

          <Time.Group className={time.group}>
            <Time.Value type="current" className={time.current} />
            <TimeSlider.Root render={<SliderRoot />}>
              <TimeSlider.Track render={<SliderTrack />}>
                <TimeSlider.Fill render={<SliderFill />} />
                <TimeSlider.Buffer render={<SliderBuffer />} />
              </TimeSlider.Track>
              <TimeSlider.Thumb render={<SliderThumb />} />
              <div className={preview.root}>
                <Slider.Thumbnail className={preview.thumbnail} />
                <TimeSlider.Value type="pointer" className={preview.timestamp} />
                <SpinnerIcon className={cn(icon, preview.spinner)} />
              </div>
            </TimeSlider.Root>
            <Time.Value type="duration" className={time.duration} />
          </Time.Group>

          <Tooltip.Root side="top">
            <Tooltip.Trigger render={<PlaybackRateButton className={playbackRate.button} render={<Button />} />} />
            <Tooltip.Popup className={cn(popup.tooltip)}>Toggle playback rate</Tooltip.Popup>
          </Tooltip.Root>

          <VolumePopover />

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <CaptionsButton className={iconState.captions.button} render={<Button />}>
                  <CaptionsOffIcon className={cn(icon, iconState.captions.off)} />
                  <CaptionsOnIcon className={cn(icon, iconState.captions.on)} />
                </CaptionsButton>
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>
              <CaptionsLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PiPButton className={iconState.pip.button} render={<Button />}>
                  <PipEnterIcon className={cn(icon, iconState.pip.off)} />
                  <PipExitIcon className={cn(icon, iconState.pip.on)} />
                </PiPButton>
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>
              <PiPLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <FullscreenButton className={iconState.fullscreen.button} render={<Button />}>
                  <FullscreenEnterIcon className={cn(icon, iconState.fullscreen.enter)} />
                  <FullscreenExitIcon className={cn(icon, iconState.fullscreen.exit)} />
                </FullscreenButton>
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>
              <FullscreenLabel />
            </Tooltip.Popup>
          </Tooltip.Root>
        </Tooltip.Provider>
      </Controls.Root>

      <div className={overlay} />
    </Container>
  );
}
