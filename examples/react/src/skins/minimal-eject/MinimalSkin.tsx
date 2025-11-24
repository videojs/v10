import type { PropsWithChildren } from 'react';

import { CurrentTimeDisplay, DurationDisplay, FullscreenButton, MediaContainer, MuteButton, PlayButton, Popover, PreviewTimeDisplay, TimeSlider, Tooltip, VolumeSlider } from '@videojs/react';
import {
  FullscreenEnterAltIcon,
  FullscreenExitAltIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react/icons';

import './minimal.css';

type SkinProps = PropsWithChildren<{
  className?: string;
}>;

export default function MinimalSkin({ children, className = '' }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={`vjs-minimal-skin ${className}`}>
      {children}

      <div className="overlay" />

      <div className="control-bar">
        <Tooltip.Root delay={500} closeDelay={0}>
          <Tooltip.Trigger>
            <PlayButton className="button play-button">
              <PlayIcon className="icon play-icon" />
              <PauseIcon className="icon pause-icon" />
            </PlayButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner side="top-start" sideOffset={6} collisionPadding={12}>
            <Tooltip.Popup className="popup-animation tooltip-popup">
              <span className="tooltip play-tooltip">Play</span>
              <span className="tooltip pause-tooltip">Pause</span>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <div className="time-display-group">
          <CurrentTimeDisplay
            // Use showRemaining to show count down/remaining time
            // showRemaining
            className="time-display"
          />

          <span className="duration-display">
            /
            <DurationDisplay className="time-display" />
          </span>
        </div>

        <Tooltip.Root trackCursorAxis="x">
          <Tooltip.Trigger>
            <TimeSlider.Root className="slider">
              <TimeSlider.Track className="slider-track">
                <TimeSlider.Progress className="slider-progress" />
                <TimeSlider.Pointer className="slider-pointer" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="slider-thumb" />
            </TimeSlider.Root>
          </Tooltip.Trigger>
          <Tooltip.Positioner side="top" sideOffset={12} collisionPadding={12}>
            <Tooltip.Popup className="popup-animation tooltip-popup">
              <PreviewTimeDisplay className="time-display media-preview-time-display" />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <div className="button-group">
          <Popover.Root openOnHover delay={200} closeDelay={300}>
            <Popover.Trigger>
              <MuteButton className="button mute-button">
                <VolumeHighIcon className="icon volume-high-icon" />
                <VolumeLowIcon className="icon volume-low-icon" />
                <VolumeOffIcon className="icon volume-off-icon" />
              </MuteButton>
            </Popover.Trigger>
            <Popover.Positioner side="top" sideOffset={2}>
              <Popover.Popup className="popup-animation popover-popup">
                <VolumeSlider.Root className="slider" orientation="vertical">
                  <VolumeSlider.Track className="slider-track">
                    <VolumeSlider.Progress className="slider-progress" />
                  </VolumeSlider.Track>
                  <VolumeSlider.Thumb className="slider-thumb" />
                </VolumeSlider.Root>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Root>

          <Tooltip.Root delay={500} closeDelay={0}>
            <Tooltip.Trigger>
              <FullscreenButton className="button fullscreen-button">
                <FullscreenEnterAltIcon className="icon fullscreen-enter-icon" />
                <FullscreenExitAltIcon className="icon fullscreen-exit-icon" />
              </FullscreenButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner side="top-end" sideOffset={6} collisionPadding={12}>
              <Tooltip.Popup className="popup-animation tooltip-popup">
                <span className="tooltip fullscreen-enter-tooltip">Enter Fullscreen</span>
                <span className="tooltip fullscreen-exit-tooltip">Exit Fullscreen</span>
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </div>
      </div>
    </MediaContainer>
  );
}
