import {
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/react';
import {
  button,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  playbackRate,
  popup,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/default/tailwind/audio.tailwind';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { Container, usePlayer } from '@/player/context';
import { MuteButton } from '@/ui/mute-button';
import { PlayButton } from '@/ui/play-button';
import { PlaybackRateButton } from '@/ui/playback-rate-button';
import { Popover } from '@/ui/popover';
import { SeekButton } from '@/ui/seek-button';
import { Time } from '@/ui/time';
import { TimeSlider } from '@/ui/time-slider';
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';
import { ErrorDialog } from '../error-dialog';
import type { AudioSkinProps } from './skin';

const SEEK_TIME = 10;

const ERROR_CLASSNAMES = {
  root: error.root,
  dialog: error.dialog,
  content: error.content,
  title: error.title,
  description: error.description,
  actions: error.actions,
  close: cn(button.base, button.subtle),
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

export function AudioSkinTailwind(props: AudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn(root, className)} {...rest}>
      {children}

      <ErrorDialog classNames={ERROR_CLASSNAMES} />

      <div className={controls}>
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
            </TimeSlider.Root>
            <Time.Value type="duration" className={time.duration} />
          </Time.Group>

          <Tooltip.Root side="top">
            <Tooltip.Trigger render={<PlaybackRateButton className={playbackRate.button} render={<Button />} />} />
            <Tooltip.Popup className={cn(popup.tooltip)}>Toggle playback rate</Tooltip.Popup>
          </Tooltip.Root>

          <VolumePopover />
        </Tooltip.Provider>
      </div>
    </Container>
  );
}
