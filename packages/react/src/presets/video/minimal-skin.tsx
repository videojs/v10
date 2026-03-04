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
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { Container } from '@/player/context';
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
import { VolumeSlider } from '@/ui/volume-slider';
import type { BaseSkinProps } from '../types';
import { ErrorDialog } from './error-dialog';

const SEEK_TIME = 10;

export type MinimalVideoSkinProps = BaseSkinProps;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return <button ref={ref} type="button" className={cn('media-button', className)} {...props} />;
});

const errorClasses = {
  root: 'media-error',
  dialog: 'media-error__dialog',
  content: 'media-error__content',
  title: 'media-error__title',
  description: 'media-error__description',
  actions: 'media-error__actions',
  close: 'media-button',
};

export function MinimalVideoSkin(props: MinimalVideoSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn('media-minimal-skin media-minimal-skin--video', className)} {...rest}>
      {children}

      <BufferingIndicator
        render={(props) => (
          <div {...props} className="media-buffering-indicator">
            <SpinnerIcon className="media-icon" />
          </div>
        )}
      />

      <ErrorDialog classes={errorClasses} />

      <Controls.Root className="media-controls">
        <span className="media-button-group">
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
        </span>

        <span className="media-time-controls">
          <Time.Group className="media-time">
            <Time.Value type="current" className="media-time__value media-time__value--current" />
            <Time.Separator className="media-time__separator" />
            <Time.Value type="duration" className="media-time__value media-time__value--duration" />
          </Time.Group>

          <TimeSlider.Root className="media-slider">
            <TimeSlider.Track className="media-slider__track">
              <TimeSlider.Fill className="media-slider__fill" />
              <TimeSlider.Buffer className="media-slider__buffer" />
            </TimeSlider.Track>
            <TimeSlider.Thumb className="media-slider__thumb" />
          </TimeSlider.Root>
        </span>

        <span className="media-button-group">
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

          <CaptionsButton
            render={(props) => (
              <Button {...props} className="media-button--icon media-button--captions">
                <CaptionsOffIcon className="media-icon media-icon--captions-off" />
                <CaptionsOnIcon className="media-icon media-icon--captions-on" />
              </Button>
            )}
          />

          <PiPButton
            render={(props) => (
              <Button {...props} className="media-button--icon">
                <PipIcon className="media-icon" />
              </Button>
            )}
          />

          <FullscreenButton
            render={(props) => (
              <Button {...props} className="media-button--icon media-button--fullscreen">
                <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
                <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
              </Button>
            )}
          />
        </span>
      </Controls.Root>

      {/* <div className="media-captions">
        <div className="media-captions__container">
          <span className="media-captions__text">An example cue</span>
          <span className="media-captions__text">
            <p>Another example cue with HTML</p>
          </span>
        </div>
      </div> */}

      <div className="media-overlay" />
    </Container>
  );
}
