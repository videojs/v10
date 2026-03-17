import {
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/react/minimal';
import { playbackRate } from '@videojs/skins/default/tailwind/audio.tailwind';
import {
  button,
  buttonGroup,
  controls,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  popup,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/minimal/tailwind/audio.tailwind';
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
import type { RenderProp } from '@/utils/types';
import type { MinimalAudioSkinProps } from './minimal-skin';

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

const renderMuteButton: RenderProp<MuteButton.State> = (props) => {
  return (
    <Button variant="icon" {...props} className={iconState.mute.button}>
      <VolumeOffIcon className={cn(icon, iconState.mute.volumeOff)} />
      <VolumeLowIcon className={cn(icon, iconState.mute.volumeLow)} />
      <VolumeHighIcon className={cn(icon, iconState.mute.volumeHigh)} />
    </Button>
  );
};

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

function PlayLabel(): ReactNode {
  const paused = usePlayer((s) => Boolean(s.paused));
  const ended = usePlayer((s) => Boolean(s.ended));
  if (ended) return <>Replay</>;
  return paused ? <>Play</> : <>Pause</>;
}

/* ------------------------------------------ Skin ------------------------------------------- */

export function MinimalAudioSkinTailwind(props: MinimalAudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;
  const canShowVolumePopover = usePlayer((s) => s.volumeAvailability === 'available');

  return (
    <Container className={cn(root, className)} {...rest}>
      {children}

      <div className={controls}>
        <Tooltip.Provider>
          <div className={buttonGroup}>
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
          </div>

          <div className={time.controls}>
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
          </div>

          <div className={buttonGroup}>
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

            {canShowVolumePopover ? (
              <Popover.Root openOnHover delay={200} closeDelay={100} side="left">
                <Popover.Trigger render={<MuteButton render={renderMuteButton} />} />
                <Popover.Popup className={cn(popup.volume)}>
                  <VolumeSlider.Root
                    orientation="horizontal"
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
            ) : (
              <MuteButton render={renderMuteButton} />
            )}
          </div>
        </Tooltip.Provider>
      </div>
    </Container>
  );
}
