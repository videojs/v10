import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/react/minimal';
import { playbackRate } from '@videojs/skins/default/tailwind/video.tailwind';
import {
  bufferingIndicator,
  button,
  buttonGroup,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  overlay,
  popup,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
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
import { SeekButton } from '@/ui/seek-button';
import { Time } from '@/ui/time';
import { TimeSlider } from '@/ui/time-slider';
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';
import { ErrorDialog } from './error-dialog';
import type { MinimalVideoSkinProps } from './minimal-skin';

const SEEK_TIME = 10;

/* --------------------------------------- Components ---------------------------------------- */

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'> & { variant?: 'icon' }>(function Button(
  { className, variant, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(button.base, variant === 'icon' ? button.icon : button.default, className)}
      {...props}
    />
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

const SliderThumb = forwardRef<HTMLDivElement, ComponentProps<'div'> & { persistent?: boolean }>(function SliderThumb(
  { persistent, className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(slider.thumb.base, persistent ? undefined : slider.thumb.interactive, className)}
      {...props}
    />
  );
});

const errorClasses = {
  root: error.root,
  dialog: error.dialog,
  content: error.content,
  title: error.title,
  actions: error.actions,
  close: cn(button.base, button.default),
};

function PlayLabel(): ReactNode {
  const paused = usePlayer((s) => Boolean(s.paused));
  const ended = usePlayer((s) => Boolean(s.ended));
  if (ended) return <>Replay</>;
  return paused ? <>Play</> : <>Pause</>;
}

function CaptionsLabel(): ReactNode {
  const active = usePlayer((s) => Boolean(s.subtitlesShowing));
  return active ? <>Disable captions</> : <>Enable captions</>;
}

function PiPLabel(): ReactNode {
  const pip = usePlayer((s) => Boolean(s.pip));
  return pip ? <>Exit picture-in-picture</> : <>Enter picture-in-picture</>;
}

function FullscreenLabel(): ReactNode {
  const fullscreen = usePlayer((s) => Boolean(s.fullscreen));
  return fullscreen ? <>Exit fullscreen</> : <>Enter fullscreen</>;
}

/* ------------------------------------------ Skin ------------------------------------------- */

export function MinimalVideoSkinTailwind(props: MinimalVideoSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn(root(false), className)} {...rest}>
      {children}

      <BufferingIndicator
        render={(props) => (
          <div {...props} className={bufferingIndicator}>
            <SpinnerIcon className={icon} />
          </div>
        )}
      />

      <ErrorDialog classes={errorClasses} />

      <Controls.Root
        data-controls="" // Used as a hook for Tailwind has-[] styles
        className={controls}
      >
        <span className={buttonGroup}>
          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PlayButton
                  render={(props) => (
                    <Button variant="icon" {...props} className={iconState.play.button}>
                      <RestartIcon className={cn(icon, iconState.play.restart)} />
                      <PlayIcon className={cn(icon, iconState.play.play)} />
                      <PauseIcon className={cn(icon, iconState.play.pause)} />
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>
              <PlayLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <SeekButton
                  seconds={-SEEK_TIME}
                  render={(props) => (
                    <Button variant="icon" {...props} className={seek.button}>
                      <span className={iconContainer}>
                        <SeekIcon className={cn(icon, iconFlipped)} />
                        <span className={cn(seek.label, seek.labelBackward)}>{SEEK_TIME}</span>
                      </span>
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <SeekButton
                  seconds={SEEK_TIME}
                  render={(props) => (
                    <Button variant="icon" {...props} className={seek.button}>
                      <span className={iconContainer}>
                        <SeekIcon className={icon} />
                        <span className={cn(seek.label, seek.labelForward)}>{SEEK_TIME}</span>
                      </span>
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>Seek forward {SEEK_TIME} seconds</Tooltip.Popup>
          </Tooltip.Root>
        </span>

        <span className={time.controls}>
          <Time.Group className={time.group}>
            <Time.Value type="current" className={time.current} />
            <Time.Separator className={time.separator} />
            <Time.Value type="duration" className={time.duration} />
          </Time.Group>

          <TimeSlider.Root render={(props) => <SliderRoot {...props} />}>
            <TimeSlider.Track render={(props) => <SliderTrack {...props} />}>
              <TimeSlider.Fill render={(props) => <SliderFill {...props} />} />
              <TimeSlider.Buffer render={(props) => <SliderFill type="buffer" {...props} />} />
            </TimeSlider.Track>
            <TimeSlider.Thumb render={(props) => <SliderThumb {...props} />} />
          </TimeSlider.Root>
        </span>

        <span className={buttonGroup}>
          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PlaybackRateButton
                  render={(props) => <Button variant="icon" {...props} className={playbackRate.button} />}
                />
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>Toggle playback rate</Tooltip.Popup>
          </Tooltip.Root>

          <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
            <Popover.Trigger
              render={
                <MuteButton
                  render={(props) => (
                    <Button variant="icon" {...props} className={iconState.mute.button}>
                      <VolumeOffIcon className={cn(icon, iconState.mute.volumeOff)} />
                      <VolumeLowIcon className={cn(icon, iconState.mute.volumeLow)} />
                      <VolumeHighIcon className={cn(icon, iconState.mute.volumeHigh)} />
                    </Button>
                  )}
                />
              }
            />
            <Popover.Popup className={cn(popup.volume)}>
              <VolumeSlider.Root
                orientation="vertical"
                thumbAlignment="edge"
                render={(props) => <SliderRoot {...props} />}
              >
                <VolumeSlider.Track render={(props) => <SliderTrack {...props} />}>
                  <VolumeSlider.Fill render={(props) => <SliderFill {...props} />} />
                </VolumeSlider.Track>
                <VolumeSlider.Thumb render={(props) => <SliderThumb persistent {...props} />} />
              </VolumeSlider.Root>
            </Popover.Popup>
          </Popover.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <CaptionsButton
                  render={(props) => (
                    <Button variant="icon" {...props} className={iconState.captions.button}>
                      <CaptionsOffIcon className={cn(icon, iconState.captions.off)} />
                      <CaptionsOnIcon className={cn(icon, iconState.captions.on)} />
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>
              <CaptionsLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PiPButton
                  render={(props) => (
                    <Button variant="icon" {...props}>
                      <PipIcon className={icon} />
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>
              <PiPLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <FullscreenButton
                  render={(props) => (
                    <Button variant="icon" {...props} className={iconState.fullscreen.button}>
                      <FullscreenEnterIcon className={cn(icon, iconState.fullscreen.enter)} />
                      <FullscreenExitIcon className={cn(icon, iconState.fullscreen.exit)} />
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className={cn(popup.tooltip)}>
              <FullscreenLabel />
            </Tooltip.Popup>
          </Tooltip.Root>
        </span>
      </Controls.Root>

      <div className={overlay} />
    </Container>
  );
}
