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
} from '@videojs/icons/react';
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
import type { BaseSkinProps } from '../types';
import { ErrorDialog } from './error-dialog';

const SEEK_TIME = 10;

export type VideoSkinProps = BaseSkinProps;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return <button ref={ref} type="button" className={cn('media-button', className)} {...props} />;
});

const errorClasses = {
  root: 'media-error',
  dialog: 'media-error__dialog media-surface',
  content: 'media-error__content',
  title: 'media-error__title',
  description: 'media-error__description',
  actions: 'media-error__actions',
  close: 'media-button',
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

export function VideoSkin(props: VideoSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn('media-default-skin media-default-skin--video', className)} {...rest}>
      {children}

      <BufferingIndicator
        render={(props) => (
          <div {...props} className="media-buffering-indicator">
            <div className="media-surface">
              <SpinnerIcon className="media-icon" />
            </div>
          </div>
        )}
      />

      <ErrorDialog classes={errorClasses} />

      <Controls.Root className="media-surface media-controls">
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
          <Popover.Popup className="media-surface media-popover media-popover--volume">
            <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
              <VolumeSlider.Track className="media-slider__track">
                <VolumeSlider.Fill className="media-slider__fill" />
              </VolumeSlider.Track>
              <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
            </VolumeSlider.Root>
          </Popover.Popup>
        </Popover.Root>

        <Tooltip.Root side="top">
          <Tooltip.Trigger
            render={
              <CaptionsButton
                render={(props) => (
                  <Button {...props} className="media-button--icon media-button--captions">
                    <CaptionsOffIcon className="media-icon media-icon--captions-off" />
                    <CaptionsOnIcon className="media-icon media-icon--captions-on" />
                  </Button>
                )}
              />
            }
          />
          <Tooltip.Popup className="media-surface media-tooltip">
            <CaptionsLabel />
          </Tooltip.Popup>
        </Tooltip.Root>

        <Tooltip.Root side="top">
          <Tooltip.Trigger
            render={
              <PiPButton
                render={(props) => (
                  <Button {...props} className="media-button--icon">
                    <PipIcon className="media-icon" />
                  </Button>
                )}
              />
            }
          />
          <Tooltip.Popup className="media-surface media-tooltip">
            <PiPLabel />
          </Tooltip.Popup>
        </Tooltip.Root>

        <Tooltip.Root side="top">
          <Tooltip.Trigger
            render={
              <FullscreenButton
                render={(props) => (
                  <Button {...props} className="media-button--icon media-button--fullscreen">
                    <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
                    <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
                  </Button>
                )}
              />
            }
          />
          <Tooltip.Popup className="media-surface media-tooltip">
            <FullscreenLabel />
          </Tooltip.Popup>
        </Tooltip.Root>
      </Controls.Root>

      <div className="media-overlay" />
    </Container>
  );
}
