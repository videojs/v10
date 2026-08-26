'use client';

import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';

import {
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons/minimal';
import { Container } from '@/player/container';
import { usePlayer } from '@/player/context';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { ErrorDialog } from '@/ui/error-dialog';
import { Hotkey } from '@/ui/hotkey';
import { LiveButton } from '@/ui/live-button';
import { MuteButton } from '@/ui/mute-button';
import { PlayButton } from '@/ui/play-button';
import { Popover } from '@/ui/popover';
import { StatusAnnouncer } from '@/ui/status-announcer';
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';

import type { BaseSkinProps } from '../types';

export type MinimalLiveAudioSkinProps = BaseSkinProps;

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

  if (volumeUnavailable) {
    return (
      <Tooltip.Root side="top" delay={0} sticky>
        <Tooltip.Trigger render={muteButton} />
        <Tooltip.Popup className="media-tooltip">
          <Tooltip.Label />
          <Tooltip.Shortcut className="media-tooltip__kbd" />
        </Tooltip.Popup>
      </Tooltip.Root>
    );
  }

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="left" boundary="viewport">
      <Tooltip.Root side="top" delay={0} sticky>
        <Tooltip.Trigger render={<Popover.Trigger render={muteButton} />} />
        <Tooltip.Popup className="media-tooltip">
          <Tooltip.Label />
          <Tooltip.Shortcut className="media-tooltip__kbd" />
        </Tooltip.Popup>
      </Tooltip.Root>
      <Popover.Popup className="media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="horizontal" thumbAlignment="edge">
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
 * Minimal audio skin configured for live playback. Mirrors {@link MinimalAudioSkin} but omits the time slider and the
 * current / duration / remaining time displays. A flexible spacer stretches between the play and volume controls so
 * they sit at opposite edges of the control bar.
 */
export function MinimalLiveAudioSkin(props: MinimalLiveAudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn('media-minimal-skin media-minimal-skin--audio', className)} {...rest}>
      {children}

      <ErrorDialog.Root>
        <ErrorDialog.Popup className="media-dialog__popup">
          <div className="media-dialog__dialog">
            <div className="media-dialog__content">
              <ErrorDialog.Title className="media-dialog__title"></ErrorDialog.Title>
              <ErrorDialog.Description className="media-dialog__description" />
            </div>
            <div className="media-dialog__actions">
              <ErrorDialog.Close className="media-button media-button--subtle"></ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <div className="media-controls">
        <Tooltip.Provider>
          <div className="media-button-group">
            <span className="media-button--play__wrapper">
              <BufferingIndicator
                render={(props) => (
                  <div {...props} className="media-buffering-indicator">
                    <SpinnerIcon className="media-icon" />
                  </div>
                )}
              />
              <Tooltip.Root side="top" boundary="viewport">
                <Tooltip.Trigger
                  render={
                    <PlayButton className="media-button--play" render={<Button />}>
                      <RestartIcon className="media-icon media-icon--restart" />
                      <PlayIcon className="media-icon media-icon--play" />
                      <PauseIcon className="media-icon media-icon--pause" />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">
                  <Tooltip.Label />
                  <Tooltip.Shortcut className="media-tooltip__kbd" />
                </Tooltip.Popup>
              </Tooltip.Root>
            </span>

            <LiveButton className="media-button media-button--subtle media-button--live" />
          </div>

          <div className="media-time-controls" aria-hidden="true" />

          <div className="media-button-group">
            <VolumePopover />
          </div>
        </Tooltip.Provider>
      </div>

      {/* Hotkeys */}
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />

      {/* Input Feedback */}
      <StatusAnnouncer className="media-sr-only" />
    </Container>
  );
}
