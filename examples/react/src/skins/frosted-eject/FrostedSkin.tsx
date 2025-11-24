import type { PropsWithChildren } from 'react';

import { CurrentTimeDisplay, DurationDisplay, FullscreenButton, MediaContainer, MuteButton, PlayButton, Popover, PreviewTimeDisplay, TimeSlider, Tooltip, VolumeSlider } from '@videojs/react';
import {
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react/icons';

import './frosted.css';

type SkinProps = PropsWithChildren<{
  className?: string;
}>;

export default function FrostedSkin({ children, className = '' }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={`vjs-frosted-skin ${className}`}>
      {children}

      <div className="overlay" />

      <div className="surface control-bar" data-testid="media-controls">
        <Tooltip.Root delay={500}>
          <Tooltip.Trigger>
            <PlayButton className="button play-button">
              <PlayIcon className="icon play-icon" />
              <PauseIcon className="icon pause-icon" />
            </PlayButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner side="top" sideOffset={12} collisionPadding={12}>
            <Tooltip.Popup className="tooltip-popup surface popup-animation">
              <span className="tooltip play-tooltip">Play</span>
              <span className="tooltip pause-tooltip">Pause</span>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <div className="time-controls">
          <CurrentTimeDisplay
            // Use showRemaining to show count down/remaining time
            // showRemaining
            className="time-display"
          />

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
            <Tooltip.Positioner side="top" sideOffset={18} collisionPadding={12}>
              <Tooltip.Popup className="surface popup-animation tooltip-popup">
                <PreviewTimeDisplay className="time-display media-preview-time-display" />
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Root>

          <DurationDisplay className="time-display" />
        </div>

        <Popover.Root openOnHover delay={200} closeDelay={100}>
          <Popover.Trigger>
            <MuteButton className="button mute-button">
              <VolumeHighIcon className="icon volume-high-icon" />
              <VolumeLowIcon className="icon volume-low-icon" />
              <VolumeOffIcon className="icon volume-off-icon" />
            </MuteButton>
          </Popover.Trigger>
          <Popover.Positioner side="top" sideOffset={12}>
            <Popover.Popup className="surface popup-animation popover-popup">
              <VolumeSlider.Root className="slider" orientation="vertical">
                <VolumeSlider.Track className="slider-track">
                  <VolumeSlider.Progress className="slider-progress" />
                </VolumeSlider.Track>
                <VolumeSlider.Thumb className="slider-thumb" />
              </VolumeSlider.Root>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Root>

        <Tooltip.Root delay={500}>
          <Tooltip.Trigger>
            <FullscreenButton className="button fullscreen-button">
              <FullscreenEnterIcon className="icon fullscreen-enter-icon" />
              <FullscreenExitIcon className="icon fullscreen-exit-icon" />
            </FullscreenButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner side="top" sideOffset={12} collisionPadding={12}>
            <Tooltip.Popup className="surface popup-animation tooltip-popup">
              <span className="tooltip fullscreen-enter-tooltip">Enter Fullscreen</span>
              <span className="tooltip fullscreen-exit-tooltip">Exit Fullscreen</span>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Root>
      </div>
    </MediaContainer>
  );
}
