import { isString } from '@videojs/utils/predicate';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  CastEnterIcon,
  CastExitIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
  RestartIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons';
import { Container, usePlayer } from '@/player/context';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { CaptionsButton } from '@/ui/captions-button';
import { CastButton } from '@/ui/cast-button';
import { Controls } from '@/ui/controls';
import { ErrorDialog } from '@/ui/error-dialog';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { Gesture } from '@/ui/gesture';
import { Hotkey } from '@/ui/hotkey';
import { LiveButton } from '@/ui/live-button';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { StatusAnnouncer } from '@/ui/status-announcer/status-announcer';
import { StatusIndicator } from '@/ui/status-indicator';
import { Tooltip } from '@/ui/tooltip';
import { VolumeIndicator } from '@/ui/volume-indicator';
import { VolumeSlider } from '@/ui/volume-slider';
import { isRenderProp } from '@/utils/use-render';
import type { BaseVideoSkinProps } from '../types';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;
const CENTER_STATUS_ACTIONS = ['togglePaused'] as const;

export type LiveVideoSkinProps = BaseVideoSkinProps;

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

export function TooltipPopup(props: Omit<Tooltip.PopupProps, 'children' | 'className'>): ReactNode {
  return (
    <Tooltip.Popup className="media-surface media-tooltip" {...props}>
      <Tooltip.Label />
      <Tooltip.Shortcut className="media-tooltip__kbd" />
    </Tooltip.Popup>
  );
}

/**
 * Default video skin configured for live playback. Mirrors {@link VideoSkin}
 * but omits the time slider and the duration / current-time displays. A
 * flexible spacer stretches between the start and end button groups so they
 * sit at opposite edges of the control bar.
 */
export function LiveVideoSkin(props: LiveVideoSkinProps): ReactNode {
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
              <TooltipPopup />
            </Tooltip.Root>

            <LiveButton className="media-button media-button--subtle media-button--live" />
          </div>

          <div className="media-time-controls" aria-hidden="true" />

          <div className="media-button-group">
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
              <TooltipPopup />
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <CastButton className="media-button--cast" render={<Button />}>
                    <CastEnterIcon className="media-icon media-icon--cast-enter" />
                    <CastExitIcon className="media-icon media-icon--cast-exit" />
                  </CastButton>
                }
              />
              <TooltipPopup />
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
              <TooltipPopup />
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
              <TooltipPopup />
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      </Controls.Root>

      <div className="media-overlay" />

      {/* Hotkeys */}
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="c" action="toggleSubtitles" />
      <Hotkey keys="i" action="togglePictureInPicture" />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />

      {/* Gestures */}
      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />

      {/* Input Feedback */}
      <StatusAnnouncer />
      <div className="media-input-feedback">
        <VolumeIndicator.Root className="media-surface media-input-feedback-island media-input-feedback-island--volume">
          <VolumeIndicator.Fill className="media-input-feedback-island__content">
            <VolumeHighIcon className="media-icon media-icon--volume-high" />
            <VolumeLowIcon className="media-icon media-icon--volume-low" />
            <VolumeOffIcon className="media-icon media-icon--volume-off" />
            <VolumeIndicator.Value className="media-input-feedback-island__value" />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>

        <StatusIndicator.Root
          actions={TOP_STATUS_ACTIONS}
          className="media-surface media-input-feedback-island media-input-feedback-island--status"
        >
          <div className="media-input-feedback-island__content">
            <CaptionsOnIcon className="media-icon media-icon--captions-on" />
            <CaptionsOffIcon className="media-icon media-icon--captions-off" />
            <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
            <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
            <PipEnterIcon className="media-icon media-icon--pip-enter" />
            <PipExitIcon className="media-icon media-icon--pip-exit" />
            <StatusIndicator.Value className="media-input-feedback-island__value" />
          </div>
        </StatusIndicator.Root>

        <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className="media-input-feedback-bubble">
          <PlayIcon className="media-icon media-icon--play" />
          <PauseIcon className="media-icon media-icon--pause" />
        </StatusIndicator.Root>
      </div>
    </Container>
  );
}
