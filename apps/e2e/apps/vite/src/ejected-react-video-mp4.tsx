/**
 * Ejected React skin test page.
 *
 * Composes individual React UI components manually — exactly what a user
 * does after ejecting the VideoSkin component. This mirrors the composition
 * from `packages/react/src/presets/video/skin.tsx`.
 */

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
  BufferingIndicator,
  CaptionsButton,
  Container,
  Controls,
  createPlayer,
  ErrorDialog,
  FullscreenButton,
  MuteButton,
  PiPButton,
  PlayButton,
  PlaybackRateButton,
  Popover,
  Poster,
  SeekButton,
  Slider,
  Time,
  TimeSlider,
  Tooltip,
  usePlayer,
  VolumeSlider,
} from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/skin.css';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MEDIA } from './shared';

const SEEK_TIME = 10;

const Player = createPlayer({ features: videoFeatures });

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  const base = 'media-button media-button--subtle media-button--icon';
  return <button ref={ref} type="button" className={className ? `${base} ${className}` : base} {...props} />;
});

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

function EjectedVideoSkin({ children }: { children: ReactNode }): ReactNode {
  return (
    <Container className="media-default-skin media-default-skin--video" style={{ maxWidth: 800, aspectRatio: '16/9' }}>
      {children}

      <Poster src={MEDIA.mp4.poster} />

      <BufferingIndicator
        render={(props) => (
          <div {...props} className="media-buffering-indicator">
            <div className="media-surface">
              <SpinnerIcon className="media-icon" />
            </div>
          </div>
        )}
      />

      <ErrorDialog.Root>
        <ErrorDialog.Popup className="media-error">
          <div className="media-error__dialog media-surface">
            <div className="media-error__content">
              <ErrorDialog.Title className="media-error__title">Something went wrong.</ErrorDialog.Title>
              <ErrorDialog.Description className="media-error__description" />
            </div>
            <div className="media-error__actions">
              <ErrorDialog.Close className="media-button media-button--primary">OK</ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root className="media-surface media-controls">
        <Tooltip.Provider>
          <div className="media-button-group">
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
              <Tooltip.Popup className="media-surface media-tooltip" />
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
          </div>

          <div className="media-time-controls">
            <Time.Value type="current" className="media-time" />
            <TimeSlider.Root className="media-slider">
              <TimeSlider.Track className="media-slider__track">
                <TimeSlider.Fill className="media-slider__fill" />
                <TimeSlider.Buffer className="media-slider__buffer" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="media-slider__thumb" />

              <div className="media-surface media-preview media-slider__preview">
                <Slider.Thumbnail className="media-preview__thumbnail" />
                <TimeSlider.Value type="pointer" className="media-time media-preview__time" />
                <SpinnerIcon className="media-preview__spinner media-icon" />
              </div>
            </TimeSlider.Root>
            <Time.Value type="duration" className="media-time" />
          </div>

          <div className="media-button-group">
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
              <Tooltip.Popup className="media-surface media-tooltip" />
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
              <Tooltip.Popup className="media-surface media-tooltip" />
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
              <Tooltip.Popup className="media-surface media-tooltip" />
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      </Controls.Root>

      <div className="media-overlay" />
    </Container>
  );
}

function App() {
  return (
    <Player.Provider>
      <EjectedVideoSkin>
        <Video src={MEDIA.mp4.url} playsInline crossOrigin="anonymous">
          <track kind="metadata" label="thumbnails" src={MEDIA.mp4.storyboard} default />
        </Video>
      </EjectedVideoSkin>
    </Player.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
