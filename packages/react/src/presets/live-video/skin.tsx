'use client';

import { captionsText } from '@videojs/core/i18n/text/menu';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';

import { useTranslator } from '@/i18n/context';
import {
  AirPlayEnterIcon,
  AirPlayExitIcon,
  CaptionsOffIcon,
  CaptionsOnIcon,
  CastEnterIcon,
  CastExitIcon,
  CheckIcon,
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
import { Container } from '@/player/container';
import { usePlayer } from '@/player/context';
import { AirPlayButton } from '@/ui/airplay-button';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { CaptionsButton } from '@/ui/captions-button';
import { useCaptionsOptions } from '@/ui/captions-radio-group';
import { CastButton } from '@/ui/cast-button';
import { Controls } from '@/ui/controls';
import { ErrorDialog } from '@/ui/error-dialog';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { Gesture } from '@/ui/gesture';
import { Hotkey } from '@/ui/hotkey';
import { LiveButton } from '@/ui/live-button';
import { Menu } from '@/ui/menu';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { StatusAnnouncer } from '@/ui/status-announcer';
import { StatusIndicator } from '@/ui/status-indicator';
import { Tooltip } from '@/ui/tooltip';
import { VolumeIndicator } from '@/ui/volume-indicator';
import { VolumeSlider } from '@/ui/volume-slider';

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
  const volumeUnavailable = usePlayer((s) => s.volumeAvailability !== 'available');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnavailable) return muteButton;

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

/**
 * Default video skin configured for live playback. Mirrors {@link VideoSkin} but omits the time slider and the duration
 * / current-time displays. A flexible spacer stretches between the start and end button groups so they sit at opposite
 * edges of the control bar.
 */
function CaptionsTrigger(): ReactNode {
  const t = useTranslator();
  const captions = useCaptionsOptions();
  if (!captions) return null;

  const { disabled } = captions;

  if (!captions.showMenu) {
    return (
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
          <Tooltip.Label />
          <Tooltip.Shortcut className="media-tooltip__kbd" />
        </Tooltip.Popup>
      </Tooltip.Root>
    );
  }

  const { options, setValue, value } = captions;

  return (
    <Menu.Root side="top" align="center">
      <Menu.Trigger
        disabled={disabled}
        render={
          <CaptionsButton className="media-button--captions" render={<Button />}>
            <CaptionsOffIcon className="media-icon media-icon--captions-off" />
            <CaptionsOnIcon className="media-icon media-icon--captions-on" />
          </CaptionsButton>
        }
      />
      <Menu.Popup className="media-surface media-popover media-menu media-menu--captions">
        <Menu.Content className="media-menu__content">
          <Menu.RadioGroup
            className="media-menu__group"
            value={value}
            onValueChange={setValue}
            aria-label={t(captionsText)}
          >
            {options.map((option) => (
              <Menu.RadioItem
                key={option.value}
                className="media-menu__item"
                value={option.value}
                disabled={option.disabled}
              >
                <bdi dir="auto">{option.label}</bdi>
                <Menu.ItemIndicator checked={option.value === value} forceMount className="media-menu__indicator">
                  <CheckIcon className="media-icon" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

export function LiveVideoSkin(props: LiveVideoSkinProps): ReactNode {
  const { children, className, renderPoster, style, ...rest } = props;

  return (
    <Container className={cn('media-default-skin media-default-skin--video', className)} style={style} {...rest}>
      {children}

      <Poster render={renderPoster} />

      <BufferingIndicator
        render={(props) => (
          <div {...props} className="media-buffering-indicator">
            <SpinnerIcon className="media-icon" />
          </div>
        )}
      />

      <ErrorDialog.Root>
        <ErrorDialog.Backdrop className="media-dialog__backdrop" />
        <ErrorDialog.Popup className="media-dialog__popup media-surface">
          <div className="media-dialog__content">
            <ErrorDialog.Title className="media-dialog__title"></ErrorDialog.Title>
            <ErrorDialog.Description className="media-dialog__description" />
          </div>
          <div className="media-dialog__actions">
            <ErrorDialog.Close className="media-button media-button--primary"></ErrorDialog.Close>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root>
        <Controls.Backdrop className="media-controls__backdrop" />
        <Controls.Content className="media-surface media-controls media-controls--root">
          <Tooltip.Provider>
            <Controls.Group className="media-surface media-controls media-controls--primary">
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
                  <Tooltip.Popup className="media-surface media-tooltip">
                    <Tooltip.Label />
                    <Tooltip.Shortcut className="media-tooltip__kbd" />
                  </Tooltip.Popup>
                </Tooltip.Root>

                <LiveButton className="media-button media-button--subtle media-button--live" />
              </div>

              <div className="media-time-controls" aria-hidden="true" />

              <div className="media-button-group">
                <VolumePopover />

                <CaptionsTrigger />

                <Tooltip.Root side="top">
                  <Tooltip.Trigger
                    render={
                      <CastButton className="media-button--cast" render={<Button />}>
                        <CastEnterIcon className="media-icon media-icon--cast-enter" />
                        <CastExitIcon className="media-icon media-icon--cast-exit" />
                      </CastButton>
                    }
                  />
                  <Tooltip.Popup className="media-surface media-tooltip">
                    <Tooltip.Label />
                    <Tooltip.Shortcut className="media-tooltip__kbd" />
                  </Tooltip.Popup>
                </Tooltip.Root>

                <Tooltip.Root side="top">
                  <Tooltip.Trigger
                    render={
                      <AirPlayButton className="media-button--airplay" render={<Button />}>
                        <AirPlayEnterIcon className="media-icon media-icon--airplay-enter" />
                        <AirPlayExitIcon className="media-icon media-icon--airplay-exit" />
                      </AirPlayButton>
                    }
                  />
                  <Tooltip.Popup className="media-surface media-tooltip">
                    <Tooltip.Label />
                    <Tooltip.Shortcut className="media-tooltip__kbd" />
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
                    <Tooltip.Label />
                    <Tooltip.Shortcut className="media-tooltip__kbd" />
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
                    <Tooltip.Label />
                    <Tooltip.Shortcut className="media-tooltip__kbd" />
                  </Tooltip.Popup>
                </Tooltip.Root>
              </div>
            </Controls.Group>
          </Tooltip.Provider>
        </Controls.Content>
      </Controls.Root>

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

      {/* Input Indicators */}
      <StatusAnnouncer className="media-sr-only" />
      <div className="media-input-indicator">
        <VolumeIndicator.Root className="media-surface media-volume-indicator">
          <VolumeIndicator.Fill className="media-volume-indicator__content">
            <VolumeHighIcon className="media-icon media-icon--volume-high" />
            <VolumeLowIcon className="media-icon media-icon--volume-low" />
            <VolumeOffIcon className="media-icon media-icon--volume-off" />
            <VolumeIndicator.Value className="media-volume-indicator__value" />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>

        <StatusIndicator.Root
          actions={TOP_STATUS_ACTIONS}
          className="media-surface media-status-indicator media-status-indicator--state"
        >
          <div className="media-status-indicator__content">
            <CaptionsOnIcon className="media-icon media-icon--captions-on" />
            <CaptionsOffIcon className="media-icon media-icon--captions-off" />
            <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
            <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
            <PipEnterIcon className="media-icon media-icon--pip-enter" />
            <PipExitIcon className="media-icon media-icon--pip-exit" />
            <StatusIndicator.Value className="media-status-indicator__value" />
          </div>
        </StatusIndicator.Root>

        <StatusIndicator.Root
          actions={CENTER_STATUS_ACTIONS}
          className="media-status-indicator media-status-indicator--playback"
        >
          <PlayIcon className="media-icon media-icon--play" />
          <PauseIcon className="media-icon media-icon--pause" />
        </StatusIndicator.Root>
      </div>
    </Container>
  );
}
