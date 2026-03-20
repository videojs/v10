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
import type { BaseVideoSkinProps } from '../types';

const SEEK_TIME = 10;

const ERROR_CLASSNAMES = {
  root: 'media-error',
  dialog: 'media-error__dialog',
  content: 'media-error__content',
  title: 'media-error__title',
  description: 'media-error__description',
  actions: 'media-error__actions',
  close: 'media-button media-button--subtle',
};

export type VideoSkinProps = BaseVideoSkinProps;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn('media-button media-button--subtle media-button--icon', className)}
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
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
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

export function VideoSkin(props: VideoSkinProps): ReactNode {
  const { children, className, poster, ...rest } = props;

  return (
    <Container className={cn('media-default-skin media-default-skin--video', className)} {...rest}>
      {children}

      {poster && (
        <Poster src={isString(poster) ? poster : undefined} render={isRenderProp(poster) ? poster : undefined} />
      )}

      <BufferingIndicator
        render={(props) => (
          <div {...props} className="media-buffering-indicator">
            <div className="media-surface">
              <SpinnerIcon className="media-icon" />
            </div>
          </div>
        )}
      />

      <ErrorDialog classNames={ERROR_CLASSNAMES} />

      <Controls.Root className="media-surface media-controls">
        <Tooltip.Provider>
          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PlayButton className="media-button--play" render={<Button />}>
                  <RestartIcon className="media-icon media-icon--restart" />
                  <PlayIcon className="media-icon media-icon--play" />
                  <PauseIcon className="media-icon media-icon--pause" />
                </PlayButton>
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">
              <PlayLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <SeekButton seconds={-SEEK_TIME} className="media-button--seek" render={<Button />}>
                  <span className="media-icon__container">
                    <SeekIcon className="media-icon media-icon--seek media-icon--flipped" />
                    <span className="media-icon__label">{SEEK_TIME}</span>
                  </span>
                </SeekButton>
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <SeekButton seconds={SEEK_TIME} className="media-button--seek" render={<Button />}>
                  <span className="media-icon__container">
                    <SeekIcon className="media-icon media-icon--seek" />
                    <span className="media-icon__label">{SEEK_TIME}</span>
                  </span>
                </SeekButton>
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

              <div className="media-surface media-preview media-slider__preview">
                <Slider.Thumbnail className="media-preview__thumbnail" />
                <TimeSlider.Value type="pointer" className="media-preview__timestamp" />
                <SpinnerIcon className="media-preview__spinner media-icon" />
              </div>
            </TimeSlider.Root>
            <Time.Value type="duration" className="media-time__value" />
          </Time.Group>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={<PlaybackRateButton className="media-button--playback-rate" render={<Button />} />}
            />
            <Tooltip.Popup className="media-surface media-tooltip">Toggle playback rate</Tooltip.Popup>
          </Tooltip.Root>

          <VolumePopover />

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <CaptionsButton className="media-button--captions" render={<Button />}>
                  <CaptionsOffIcon className="media-icon media-icon--captions-off" />
                  <CaptionsOnIcon className="media-icon media-icon--captions-on" />
                </CaptionsButton>
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">
              <CaptionsLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <PiPButton className="media-button--pip" render={<Button />}>
                  <PipEnterIcon className="media-icon media-icon--pip-enter" />
                  <PipExitIcon className="media-icon media-icon--pip-exit" />
                </PiPButton>
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">
              <PiPLabel />
            </Tooltip.Popup>
          </Tooltip.Root>

          <Tooltip.Root side="top">
            <Tooltip.Trigger
              render={
                <FullscreenButton className="media-button--fullscreen" render={<Button />}>
                  <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
                  <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
                </FullscreenButton>
              }
            />
            <Tooltip.Popup className="media-surface media-tooltip">
              <FullscreenLabel />
            </Tooltip.Popup>
          </Tooltip.Root>
        </Tooltip.Provider>
      </Controls.Root>

      <div className="media-overlay" />
    </Container>
  );
}
