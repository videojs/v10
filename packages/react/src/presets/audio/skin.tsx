import {
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/react';
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
import type { BaseSkinProps } from '../types';

const SEEK_TIME = 10;

export type AudioSkinProps = BaseSkinProps;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return <button ref={ref} type="button" className={cn('media-button', className)} {...props} />;
});

function PlayLabel(): ReactNode {
  const paused = usePlayer((s) => Boolean(s.paused));
  const ended = usePlayer((s) => Boolean(s.ended));
  if (ended) return <>Replay</>;
  return paused ? <>Play</> : <>Pause</>;
}

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton
      render={(props) => (
        <Button {...props} className="media-button--icon media-button--mute">
          <VolumeOffIcon className="media-icon media-icon--volume-off" />
          <VolumeLowIcon className="media-icon media-icon--volume-low" />
          <VolumeHighIcon className="media-icon media-icon--volume-high" />
        </Button>
      )}
    />
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-surface media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

export function AudioSkin(props: AudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn('media-default-skin media-default-skin--audio', className)} {...rest}>
      {children}

      <div className="media-surface media-controls">
        <Tooltip.Provider>
          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PlayButton
                  render={(props) => (
                    <Button {...props} className="media-button--icon media-button--play">
                      <RestartIcon className="media-icon media-icon--restart" />
                      <PlayIcon className="media-icon media-icon--play" />
                      <PauseIcon className="media-icon media-icon--pause" />
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">
              <PlayLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <SeekButton
                  seconds={-SEEK_TIME}
                  render={(props) => (
                    <Button {...props} className="media-button--icon media-button--seek">
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek media-icon--flipped" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <SeekButton
                  seconds={SEEK_TIME}
                  render={(props) => (
                    <Button {...props} className="media-button--icon media-button--seek">
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </Button>
                  )}
                />
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">Seek forward {SEEK_TIME} seconds</Tooltip.Popup>
          </Tooltip.Root>

          <Time.Group className="media-time">
            <Time.Value type="current" className="media-time__value" />
            <TimeSlider.Root className="media-slider">
              <TimeSlider.Track className="media-slider__track">
                <TimeSlider.Fill className="media-slider__fill" />
                <TimeSlider.Buffer className="media-slider__buffer" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="media-slider__thumb" />
            </TimeSlider.Root>
            <Time.Value type="duration" className="media-time__value" />
          </Time.Group>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PlaybackRateButton
                  render={(props) => <Button {...props} className="media-button--icon media-button--playback-rate" />}
                />
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">Toggle playback rate</Tooltip.Popup>
          </Tooltip.Root>

          <VolumePopover />
        </Tooltip.Provider>
      </div>
    </Container>
  );
}
