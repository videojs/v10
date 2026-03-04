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
import { Container } from '@/player/context';
import { MuteButton } from '@/ui/mute-button';
import { PlayButton } from '@/ui/play-button';
import { PlaybackRateButton } from '@/ui/playback-rate-button';
import { Popover } from '@/ui/popover';
import { SeekButton } from '@/ui/seek-button';
import { Time } from '@/ui/time';
import { TimeSlider } from '@/ui/time-slider';
import { VolumeSlider } from '@/ui/volume-slider';
import type { BaseSkinProps } from '../types';

const SEEK_TIME = 10;

export type AudioSkinProps = BaseSkinProps;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return <button ref={ref} type="button" className={cn('media-button', className)} {...props} />;
});

export function AudioSkin(props: AudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn('media-default-skin media-default-skin--audio', className)} {...rest}>
      {children}

      <div className="media-surface media-controls">
        <PlayButton
          render={(props) => (
            <Button {...props} className="media-button--icon media-button--play">
              <RestartIcon className="media-icon media-icon--restart" />
              <PlayIcon className="media-icon media-icon--play" />
              <PauseIcon className="media-icon media-icon--pause" />
            </Button>
          )}
        />

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

        <PlaybackRateButton
          render={(props) => <Button {...props} className="media-button--icon media-button--playback-rate" />}
        />

        <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
          <Popover.Trigger
            render={
              <MuteButton
                render={(props) => (
                  <Button {...props} className="media-button--icon media-button--mute">
                    <VolumeOffIcon className="media-icon media-icon--volume-off" />
                    <VolumeLowIcon className="media-icon media-icon--volume-low" />
                    <VolumeHighIcon className="media-icon media-icon--volume-high" />
                  </Button>
                )}
              />
            }
          />
          <Popover.Popup className="media-surface media-popup media-popup--volume media-popup-animation">
            <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
              <VolumeSlider.Track className="media-slider__track">
                <VolumeSlider.Fill className="media-slider__fill" />
              </VolumeSlider.Track>
              <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
            </VolumeSlider.Root>
          </Popover.Popup>
        </Popover.Root>
      </div>
    </Container>
  );
}
