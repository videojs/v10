import type { FullscreenButtonState, MuteButtonState, PlayButtonState } from '@videojs/core';
import {
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
import { Controls } from '@/ui/controls';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { SeekButton } from '@/ui/seek-button';
import { Time } from '@/ui/time';
import type { BaseSkinProps } from '../types';

const SEEK_TIME = 10;

export type MinimalVideoSkinProps = BaseSkinProps;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return <button ref={ref} type="button" className={cn('media-button', className)} {...props} />;
});

function PlayButtonIcon({ state, className, ...rest }: { state: PlayButtonState } & ComponentProps<'svg'>) {
  const { ended, paused } = state;
  return (
    <>
      <RestartIcon {...rest} className={cn(className, { 'media-icon--hidden': !ended })} />
      <PlayIcon {...rest} className={cn(className, { 'media-icon--hidden': ended || !paused })} />
      <PauseIcon {...rest} className={cn(className, { 'media-icon--hidden': paused })} />
    </>
  );
}

function MuteButtonIcon({ state, className, ...rest }: { state: MuteButtonState } & ComponentProps<'svg'>) {
  const { muted, volumeLevel } = state;
  return (
    <>
      <VolumeOffIcon {...rest} className={cn(className, { 'media-icon--hidden': !muted })} />
      <VolumeLowIcon {...rest} className={cn(className, { 'media-icon--hidden': muted || volumeLevel !== 'low' })} />
      <VolumeHighIcon {...rest} className={cn(className, { 'media-icon--hidden': muted || volumeLevel === 'low' })} />
    </>
  );
}

function FullscreenButtonIcon({ state, className, ...rest }: { state: FullscreenButtonState } & ComponentProps<'svg'>) {
  const { fullscreen } = state;
  return (
    <>
      <FullscreenExitIcon {...rest} className={cn(className, { 'media-icon--hidden': !fullscreen })} />
      <FullscreenEnterIcon {...rest} className={cn(className, { 'media-icon--hidden': fullscreen })} />
    </>
  );
}

export function MinimalVideoSkin(props: MinimalVideoSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn('media-minimal-skin', className)} {...rest}>
      {children}

      <BufferingIndicator
        render={(props, state) =>
          state.visible ? (
            <div {...props} className="media-buffering-indicator">
              <SpinnerIcon className="media-icon" />
            </div>
          ) : null
        }
      />

      <Controls.Root className="media-controls">
        <div className="media-button-group">
          <PlayButton
            render={(props, state) => (
              <Button {...props}>
                <PlayButtonIcon state={state} className="media-icon" />
              </Button>
            )}
          />

          <SeekButton
            seconds={-SEEK_TIME}
            render={(props) => (
              <Button {...props} className="media-button--seek">
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
              <Button {...props} className="media-button--seek">
                <span className="media-icon__container">
                  <SeekIcon className="media-icon media-icon--seek" />
                  <span className="media-icon__label">{SEEK_TIME}</span>
                </span>
              </Button>
            )}
          />
        </div>

        <span className="media-time-controls">
          <Time.Group className="media-time">
            <Time.Value type="current" className="media-time__value media-time__value--current" />
            <Time.Separator className="media-time__separator" />
            <Time.Value type="duration" className="media-time__value media-time__value--duration" />
          </Time.Group>

          {/* Temporary spacer */}
          <span className="media-slider" style={{ height: '4px', background: 'oklab(1 0 0 / 0.2)' }} />
        </span>

        <span className="media-button-group">
          <MuteButton
            render={(props, state) => (
              <Button {...props}>
                <MuteButtonIcon state={state} className="media-icon" />
              </Button>
            )}
          />

          <PiPButton
            render={(props) => (
              <Button {...props}>
                <PipIcon className="media-icon" />
              </Button>
            )}
          />

          <FullscreenButton
            render={(props, state) => (
              <Button {...props}>
                <FullscreenButtonIcon state={state} className="media-icon" />
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
