/**
 * Shared code generation module for ejected skin examples.
 * This is the single source of truth for code displayed on the home page demo and in docs.
 */

type Skin = 'frosted' | 'minimal';

/**
 * Generate React component code for the specified skin.
 * Always uses .m3u8 video source.
 */
export function generateReactComponent(skin: Skin): string {
  if (skin === 'frosted') {
    return `// npm install @videojs/react@next
import type { PropsWithChildren } from 'react';

import { CurrentTimeDisplay, DurationDisplay, FullscreenButton, MediaContainer, MuteButton, PlayButton, Popover, PreviewTimeDisplay, TimeSlider, Tooltip, VolumeSlider } from '@videojs/react-preview';
import {
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react-preview/icons';

import './frosted.css';

type SkinProps = PropsWithChildren<{
  className?: string;
}>;

export default function FrostedSkin({ children, className = '' }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={\`vjs-frosted-skin \${className}\`}>
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
}`;
  } else {
    return `// npm install @videojs/react@next
import type { PropsWithChildren } from 'react';

import { CurrentTimeDisplay, DurationDisplay, FullscreenButton, MediaContainer, MuteButton, PlayButton, Popover, PreviewTimeDisplay, TimeSlider, Tooltip, VolumeSlider } from '@videojs/react-preview';
import {
  FullscreenEnterAltIcon,
  FullscreenExitAltIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react-preview/icons';

import './minimal.css';

type SkinProps = PropsWithChildren<{
  className?: string;
}>;

export default function MinimalSkin({ children, className = '' }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={\`vjs-minimal-skin \${className}\`}>
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
}`;
  }
}

/**
 * Generate React CSS code for the specified skin.
 */
export function generateReactCSS(skin: Skin): string {
  if (skin === 'frosted') {
    return `.vjs-frosted-skin * {
  box-sizing: border-box;
}

.vjs-frosted-skin {
  position: relative;
  isolation: isolate;
  container: root / inline-size;
  overflow: clip;
  font-size: 0.8125rem;
  line-height: 1.5;
  border-radius: inherit;
  background: oklab(0 0 0);
}
.vjs-frosted-skin::before,
.vjs-frosted-skin::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
  z-index: 10;
}
.vjs-frosted-skin::before {
  inset: 1px;
  box-shadow: inset 0 0 0 1px oklab(1 0 0 / 0.15);
}
.vjs-frosted-skin::after {
  inset: 0;
  box-shadow: inset 0 0 0 1px oklab(0 0 0 / 0.1);
}

/* Fullscreen */
.vjs-frosted-skin:fullscreen {
  border-radius: 0;
}

.vjs-frosted-skin > ::slotted([slot='media']) {
  display: block;
  width: 100%;
  height: 100%;
}

/* Media Container UI Overlay Styling */
.vjs-frosted-skin > .overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-flow: column nowrap;
  align-items: start;
  pointer-events: none;
  border-radius: inherit;
  background-image: linear-gradient(to top, oklab(0 0 0 / 0.5), oklab(0 0 0 / 0.3), rgba(0, 0, 0, 0));
  backdrop-filter: saturate(1.5) brightness(0.9);
  transition: opacity 0.15s ease-out;
  transition-delay: 500ms;
  opacity: 0;
}
.vjs-frosted-skin:hover > .overlay,
.vjs-frosted-skin:has([data-paused]) > .overlay,
.vjs-frosted-skin:has([aria-expanded='true']) > .overlay {
  opacity: 1;
  transition-duration: 100ms;
  transition-delay: 0ms;
}

/* Common Surface Styles - e.g. tooltips, popovers, controls */
.vjs-frosted-skin .surface {
  background-color: oklab(1 0 0 / 0.1);
  backdrop-filter: blur(64px) brightness(0.9) saturate(1.5);
  box-shadow:
    inset 0 0 0 1px oklab(1 0 0 / 0.15),
    0 0 0 1px oklab(0 0 0 / 0.15),
    oklab(0 0 0 / 0.15) 0px 1px 3px 0px,
    oklab(0 0 0 / 0.15) 0px 1px 2px -1px;
}
@media (prefers-reduced-transparency: reduce) {
  .vjs-frosted-skin .surface {
    background-color: oklab(0 0 0 / 0.7);
    box-shadow:
      inset 0 0 0 1px oklab(0 0 0),
      0 0 0 1px oklab(1 0 0 / 0.2);
  }
}
@media (prefers-contrast: more) {
  .vjs-frosted-skin .surface {
    background-color: oklab(0 0 0 / 0.9);
    box-shadow:
      inset 0 0 0 1px oklab(0 0 0),
      0 0 0 1px oklab(1 0 0 / 0.2);
  }
}

/* Media Control Bar UI/Styles */
.vjs-frosted-skin .control-bar {
  position: absolute;
  bottom: 0.75rem;
  inset-inline: 0.75rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.125rem;
  border-radius: calc(infinity * 1px);
  will-change: scale, transform, filter, opacity;
  scale: 0.9;
  opacity: 0;
  filter: blur(8px);
  transition-property: scale, transform, filter, opacity;
  transition-delay: 500ms;
  transition-duration: 300ms;
  transition-timing-function: ease-out;
  transform-origin: bottom;
  color: oklab(1 0 0);
}
.vjs-frosted-skin:hover > .control-bar,
.vjs-frosted-skin:has([data-paused]) > .control-bar,
.vjs-frosted-skin:has([aria-expanded='true']) > .control-bar {
  opacity: 1;
  scale: 1;
  filter: blur(0px);
  transition-delay: 0ms;
  transition-duration: 100ms;
}

/* Time Display Styling */
.vjs-frosted-skin .time-controls {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0.75rem;
  padding-inline: 0.375rem;
}
.vjs-frosted-skin .time-display {
  text-shadow: 0 1px 0 oklab(0 0 0 / 0.25);
  font-variant-numeric: tabular-nums;
}

/* Generic Media Button Styling */
.vjs-frosted-skin .button {
  display: grid;
  flex-shrink: 0;
  padding: 0.5rem;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: calc(infinity * 1px);
  color: oklab(1 0 0 / 0.9);
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition-property: background-color, color, outline-offset;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.vjs-frosted-skin .button:hover,
.vjs-frosted-skin .button:focus-visible,
.vjs-frosted-skin .button[aria-expanded='true'] {
  background-color: oklab(1 0 0 / 0.1);
  color: oklab(1 0 0);
  text-decoration: none;
}
.vjs-frosted-skin .button:focus-visible {
  outline-color: oklch(62.3% 0.214 259.815);
  outline-offset: 2px;
}
.vjs-frosted-skin .button[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(1);
}

.vjs-frosted-skin .button .icon {
  grid-area: 1 / 1;
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 1px 0 oklab(0 0 0 / 0.25));
}

/* Media Play Button UI/Styles */
.vjs-frosted-skin .play-button .icon {
  opacity: 0;
  transition: opacity 150ms linear;
}

.vjs-frosted-skin .play-button:not([data-paused]) .pause-icon,
.vjs-frosted-skin .play-button[data-paused] .play-icon {
  opacity: 1;
}

/* Media Fullscreen Button UI/Styles */
.vjs-frosted-skin .fullscreen-button .icon {
  display: none;
}
.vjs-frosted-skin .fullscreen-button:not([data-fullscreen]) .fullscreen-enter-icon,
.vjs-frosted-skin .fullscreen-button[data-fullscreen] .fullscreen-exit-icon {
  display: inline;
}

/* One way to define the "default visible" icon (CJP) */
.vjs-frosted-skin .mute-button .icon {
  display: none;
}
.vjs-frosted-skin .mute-button:not([data-volume-level]) .volume-low-icon,
.vjs-frosted-skin .mute-button[data-volume-level='high'] .volume-high-icon,
.vjs-frosted-skin .mute-button[data-volume-level='low'] .volume-low-icon,
.vjs-frosted-skin .mute-button[data-volume-level='medium'] .volume-low-icon,
.vjs-frosted-skin .mute-button[data-volume-level='off'] .volume-off-icon {
  display: inline;
}

/* TimeSlider Component Styles */
.vjs-frosted-skin .slider {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: calc(infinity * 1px);
  outline: none;
}

/* Horizontal orientation styles */
.vjs-frosted-skin .slider[data-orientation='horizontal'] {
  min-width: 5rem;
  width: 100%;
  height: 1.25rem;
}

/* Vertical orientation styles */
.vjs-frosted-skin .slider[data-orientation='vertical'] {
  height: 5rem;
  width: 1.25rem;
}

.vjs-frosted-skin .slider-track {
  position: relative;
  isolation: isolate;
  background-color: oklab(1 0 0 / 0.2);
  border-radius: inherit;
  overflow: hidden;
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition: outline-offset 150ms ease-out;
  box-shadow: 0 0 0 1px oklab(0 0 0 / 0.05);
}

/* Horizontal track styles */
.vjs-frosted-skin .slider-track[data-orientation='horizontal'] {
  width: 100%;
  height: 0.25rem;
}

/* Vertical track styles */
.vjs-frosted-skin .slider-track[data-orientation='vertical'] {
  width: 0.25rem;
  height: 100%;
}

.vjs-frosted-skin .slider:focus-visible .slider-track {
  outline-color: oklch(62.3% 0.214 259.815);
  outline-offset: 6px;
}

.vjs-frosted-skin .slider-thumb {
  width: 0.625rem;
  height: 0.625rem;
  background-color: oklab(1 0 0);
  border-radius: calc(infinity * 1px);
  user-select: none;
  z-index: 10;
  box-shadow:
    0 0 0 1px oklab(0 0 0 / 0.1),
    0 1px 3px 0 oklab(0 0 0 / 0.15),
    0 1px 2px -1px oklab(0 0 0 / 0.15);
  opacity: 0;
  transition-property: opacity, height, width;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.vjs-frosted-skin .slider-thumb:active {
  width: 0.75rem;
  height: 0.75rem;
}
.vjs-frosted-skin .slider:hover .slider-thumb,
.vjs-frosted-skin .slider:focus-within .slider-thumb {
  opacity: 1;
}
.vjs-frosted-skin .slider-track[data-orientation='horizontal'] .slider-thumb {
  cursor: ew-resize;
}
.vjs-frosted-skin .slider-track[data-orientation='vertical'] .slider-thumb {
  cursor: ns-resize;
}

.vjs-frosted-skin .slider-pointer {
  background-color: oklab(1 0 0 / 0.2);
  border-radius: inherit;
}

.vjs-frosted-skin .slider-progress {
  background-color: oklab(1 0 0);
  border-radius: inherit;
}

.vjs-frosted-skin .media-preview-time-display {
  font-variant-numeric: tabular-nums;
}

.vjs-frosted-skin .popup-animation {
  transition-property: transform, scale, opacity, filter;
  transition-duration: 200ms;
  transform: scale(1);
  transform-origin: bottom;
  opacity: 1;
  filter: blur(0px);
}
.vjs-frosted-skin .popup-animation[data-starting-style],
.vjs-frosted-skin .popup-animation[data-ending-style] {
  transform: scale(0);
  opacity: 0;
  filter: blur(8px);
}
.vjs-frosted-skin .popup-animation[data-instant] {
  transition-duration: 0ms;
}

.vjs-frosted-skin .popover-popup {
  margin: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0.75rem 0.25rem;
  border-radius: calc(infinity * 1px);
}

/* Tooltip Component Styles */
.vjs-frosted-skin .tooltip-popup {
  color: oklab(1 0 0);
  padding: 0.25rem 0.625rem;
  border-radius: calc(infinity * 1px);
  font-size: 0.75rem;
}

.vjs-frosted-skin .tooltip {
  display: none;
  white-space: nowrap;
}

.vjs-frosted-skin .tooltip-popup[data-paused] .play-tooltip,
.vjs-frosted-skin .tooltip-popup:not([data-paused]) .pause-tooltip {
  display: block;
}

.vjs-frosted-skin .tooltip-popup[data-fullscreen] .fullscreen-exit-tooltip,
.vjs-frosted-skin .tooltip-popup:not([data-fullscreen]) .fullscreen-enter-tooltip {
  display: block;
}`;
  } else {
    return `.vjs-minimal-skin * {
  box-sizing: border-box;
}

.vjs-minimal-skin {
  position: relative;
  isolation: isolate;
  container: root / inline-size;
  overflow: clip;
  font-size: 0.8125rem;
  line-height: 1.5;
  border-radius: inherit;
  background: oklab(0 0 0);
}
.vjs-minimal-skin::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
  z-index: 10;
  inset: 0;
  box-shadow: inset 0 0 0 1px oklab(0 0 0 / 0.2);
}
@media (prefers-color-scheme: dark) {
  .vjs-minimal-skin::after {
    box-shadow: inset 0 0 0 1px oklab(1 0 0 / 0.2);
  }
}

/* Fullscreen */
.vjs-minimal-skin:fullscreen {
  border-radius: 0;
}

.vjs-minimal-skin > ::slotted([slot='media']) {
  display: block;
  width: 100%;
  height: 100%;
}

/* Media Container UI Overlay Styling */
.vjs-minimal-skin > .overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-flow: column nowrap;
  align-items: start;
  pointer-events: none;
  border-radius: inherit;
  background-image: linear-gradient(to top, oklab(0 0 0 / 0.7), oklab(0 0 0 / 0.5) 7.5rem, rgba(0, 0, 0, 0));
  transform: translateY(100%);
  transition-property: transform, opacity;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  transition-delay: 500ms;
  opacity: 0;
}
.vjs-minimal-skin:hover > .overlay,
.vjs-minimal-skin:has([data-paused]) > .overlay,
.vjs-minimal-skin:has([aria-expanded='true']) > .overlay {
  opacity: 1;
  transform: translateY(0);
  transition-duration: 100ms;
  transition-delay: 0ms;
}

/* Media Control Bar UI/Styles */
.vjs-minimal-skin .control-bar {
  position: absolute;
  bottom: 0;
  inset-inline: 0;
  padding: 2.5rem 0.75rem 0.75rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  will-change: transform, filter, opacity;
  transform: translateY(100%);
  opacity: 0;
  filter: blur(8px);
  transition-property: transform, filter, opacity;
  transition-delay: 500ms;
  transition-duration: 300ms;
  transition-timing-function: ease-out;
  color: oklab(1 0 0);
}
.vjs-minimal-skin:hover > .control-bar,
.vjs-minimal-skin:has([data-paused]) > .control-bar,
.vjs-minimal-skin:has([aria-expanded='true']) > .control-bar {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0px);
  transition-delay: 0ms;
  transition-duration: 100ms;
}

/* Time Display Styling */
.vjs-minimal-skin .time-display-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.vjs-minimal-skin .duration-display {
  display: contents;
  color: oklab(1 0 0 / 0.5);
}
.vjs-minimal-skin .time-display {
  text-shadow: 0 1px 0 oklab(0 0 0 / 0.2);
  font-variant-numeric: tabular-nums;
}

.vjs-minimal-skin .button-group {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

/* Generic Media Button Styling */
.vjs-minimal-skin .button {
  display: grid;
  flex-shrink: 0;
  padding: 0.625rem;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: oklab(1 0 0);
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition-property: background-color, color, outline-offset;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.vjs-minimal-skin .button:hover,
.vjs-minimal-skin .button:focus-visible,
.vjs-minimal-skin .button[aria-expanded='true'] {
  color: oklab(1 0 0 / 0.8);
  text-decoration: none;
}
.vjs-minimal-skin .button:focus-visible {
  outline-color: oklab(1 0 0);
  outline-offset: 2px;
}
.vjs-minimal-skin .button[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(1);
}

.vjs-minimal-skin .button .icon {
  grid-area: 1 / 1;
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 1px 0 oklab(0 0 0 / 0.4));
}

/* Media Play Button UI/Styles */
.vjs-minimal-skin .play-button .icon {
  opacity: 0;
  transition: opacity 150ms linear;
}

.vjs-minimal-skin .play-button:not([data-paused]) .pause-icon,
.vjs-minimal-skin .play-button[data-paused] .play-icon {
  opacity: 1;
}

/* Media Fullscreen Button UI/Styles */
.vjs-minimal-skin .fullscreen-button .icon {
  display: none;
}
.vjs-minimal-skin .fullscreen-button:not([data-fullscreen]) .fullscreen-enter-icon,
.vjs-minimal-skin .fullscreen-button[data-fullscreen] .fullscreen-exit-icon {
  display: inline;
}

/* One way to define the "default visible" icon (CJP) */
.vjs-minimal-skin .mute-button .icon {
  display: none;
}
.vjs-minimal-skin .mute-button:not([data-volume-level]) .volume-low-icon,
.vjs-minimal-skin .mute-button[data-volume-level='high'] .volume-high-icon,
.vjs-minimal-skin .mute-button[data-volume-level='low'] .volume-low-icon,
.vjs-minimal-skin .mute-button[data-volume-level='medium'] .volume-low-icon,
.vjs-minimal-skin .mute-button[data-volume-level='off'] .volume-off-icon {
  display: inline;
}

/* TimeSlider Component Styles */
.vjs-minimal-skin .slider {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: calc(infinity * 1px);
  outline: none;
}

/* Horizontal orientation styles */
.vjs-minimal-skin .slider[data-orientation='horizontal'] {
  min-width: 5rem;
  width: 100%;
  height: 1.25rem;
}

/* Vertical orientation styles */
.vjs-minimal-skin .slider[data-orientation='vertical'] {
  height: 4.5rem;
  width: 1.25rem;
}

.vjs-minimal-skin .slider-track {
  position: relative;
  isolation: isolate;
  background-color: oklab(1 0 0 / 0.2);
  border-radius: inherit;
  overflow: hidden;
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition: outline-offset 150ms ease-out;
  box-shadow: 0 0 0 1px oklab(0 0 0 / 0.05);
}

/* Horizontal track styles */
.vjs-minimal-skin .slider-track[data-orientation='horizontal'] {
  width: 100%;
  height: 0.1875rem;
}

/* Vertical track styles */
.vjs-minimal-skin .slider-track[data-orientation='vertical'] {
  width: 0.1875rem;
  height: 100%;
}

.vjs-minimal-skin .slider:focus-visible .slider-track {
  outline-color: oklab(1 0 0);
  outline-offset: 6px;
}

.vjs-minimal-skin .slider-thumb {
  width: 0.75rem;
  height: 0.75rem;
  background-color: oklab(1 0 0);
  border-radius: calc(infinity * 1px);
  user-select: none;
  z-index: 10;
  box-shadow:
    0 0 0 1px oklab(0 0 0 / 0.1),
    0 1px 3px 0 oklab(0 0 0 / 0.15),
    0 1px 2px -1px oklab(0 0 0 / 0.15);
  opacity: 0;
  scale: 0.7;
  transform-origin: center;
  transition-property: opacity, scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.vjs-minimal-skin .slider:hover .slider-thumb,
.vjs-minimal-skin .slider:focus-within .slider-thumb {
  opacity: 1;
  scale: 1;
}
.vjs-minimal-skin .slider-track[data-orientation='horizontal'] .slider-thumb {
  cursor: ew-resize;
}
.vjs-minimal-skin .slider-track[data-orientation='vertical'] .slider-thumb {
  cursor: ns-resize;
}

.vjs-minimal-skin .slider-pointer {
  display: none;
}

.vjs-minimal-skin .slider-progress {
  background-color: oklab(1 0 0);
  border-radius: inherit;
}

.vjs-minimal-skin .media-preview-time-display {
  font-variant-numeric: tabular-nums;
}

.vjs-minimal-skin .popup-animation {
  transition-property: transform, scale, opacity, filter;
  transition-duration: 200ms;
  transform: scale(1);
  transform-origin: bottom;
  opacity: 1;
  filter: blur(0px);
}
.vjs-minimal-skin .popup-animation[data-starting-style],
.vjs-minimal-skin .popup-animation[data-ending-style] {
  transform: scale(0);
  opacity: 0;
  filter: blur(8px);
}
.vjs-minimal-skin .popup-animation[data-instant] {
  transition-duration: 0ms;
}

.vjs-minimal-skin .popover-popup {
  margin: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0.75rem 0.25rem;
  border-radius: calc(infinity * 1px);
}

/* Tooltip Component Styles */
.vjs-minimal-skin .tooltip-popup {
  color: oklab(1 0 0);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  background-color: oklab(1 0 0 / 0.1);
  backdrop-filter: blur(64px) brightness(0.9) saturate(1.5);
  box-shadow:
    0 4px 6px -1px oklab(0 0 0 / 0.1),
    0 2px 4px -2px oklab(0 0 0 / 0.1);
}
@media (prefers-reduced-transparency: reduce) {
  .vjs-minimal-skin .tooltip-popup {
    background-color: oklab(0 0 0 / 0.7);
  }
}
@media (prefers-contrast: more) {
  .vjs-minimal-skin .tooltip-popup {
    background-color: oklab(0 0 0 / 0.9);
  }
}

.vjs-minimal-skin .tooltip {
  display: none;
  white-space: nowrap;
}

.vjs-minimal-skin .tooltip-popup[data-paused] .play-tooltip,
.vjs-minimal-skin .tooltip-popup:not([data-paused]) .pause-tooltip {
  display: block;
}

.vjs-minimal-skin .tooltip-popup[data-fullscreen] .fullscreen-exit-tooltip,
.vjs-minimal-skin .tooltip-popup:not([data-fullscreen]) .fullscreen-enter-tooltip {
  display: block;
}`;
  }
}

/**
 * Generate HTML markup for the specified skin.
 * Always uses .mp4 video source.
 */
export function generateHTMLMarkup(skin: Skin): string {
  if (skin === 'frosted') {
    return `<video-provider>
  <media-container>
    <video
      slot="media"
      src="https://stream.mux.com/A3VXy02VoUinw01pwyomEO3bHnG4P32xzV7u1j1FSzjNg/high.mp4"
      playsinline
      poster="https://image.mux.com/A3VXy02VoUinw01pwyomEO3bHnG4P32xzV7u1j1FSzjNg/thumbnail.webp"
    ></video>

    <div class="overlay"></div>

    <div class="control-bar surface">
      <media-play-button commandfor="play-tooltip" class="button">
        <media-play-icon class="icon play-icon"></media-play-icon>
        <media-pause-icon class="icon pause-icon"></media-pause-icon>
      </media-play-button>
      <media-tooltip
        id="play-tooltip"
        class="surface popup-animation"
        popover="manual"
        delay="500"
        side="top"
        side-offset="12"
        collision-padding="12"
      >
        <span class="tooltip play-tooltip">Play</span>
        <span class="tooltip pause-tooltip">Pause</span>
      </media-tooltip>

      <div class="time-controls">
        <!-- Use the show-remaining attribute to show count down/remaining time -->
        <media-current-time-display></media-current-time-display>

        <media-time-slider commandfor="time-slider-tooltip" class="slider">
          <media-time-slider-track class="slider-track">
            <media-time-slider-progress class="slider-progress"></media-time-slider-progress>
            <media-time-slider-pointer class="slider-pointer"></media-time-slider-pointer>
          </media-time-slider-track>
          <media-time-slider-thumb class="slider-thumb"></media-time-slider-thumb>
        </media-time-slider>
        <media-tooltip
          id="time-slider-tooltip"
          class="surface popup-animation"
          popover="manual"
          track-cursor-axis="x"
          side="top"
          side-offset="18"
          collision-padding="12"
        >
          <media-preview-time-display></media-preview-time-display>
        </media-tooltip>

        <media-duration-display></media-duration-display>
      </div>

      <media-mute-button commandfor="volume-slider-popover" command="toggle-popover" class="button">
        <media-volume-high-icon class="icon volume-high-icon"></media-volume-high-icon>
        <media-volume-low-icon class="icon volume-low-icon"></media-volume-low-icon>
        <media-volume-off-icon class="icon volume-off-icon"></media-volume-off-icon>
      </media-mute-button>
      <media-popover
        id="volume-slider-popover"
        class="surface popup-animation"
        popover="manual"
        open-on-hover
        delay="200"
        close-delay="100"
        side="top"
        side-offset="12"
        collision-padding="12"
      >
        <media-volume-slider class="slider" orientation="vertical">
          <media-volume-slider-track class="slider-track">
            <media-volume-slider-indicator class="slider-progress"></media-volume-slider-indicator>
          </media-volume-slider-track>
          <media-volume-slider-thumb class="slider-thumb"></media-volume-slider-thumb>
        </media-volume-slider>
      </media-popover>

      <media-fullscreen-button commandfor="fullscreen-tooltip" class="button">
        <media-fullscreen-enter-icon class="icon fullscreen-enter-icon"></media-fullscreen-enter-icon>
        <media-fullscreen-exit-icon class="icon fullscreen-exit-icon"></media-fullscreen-exit-icon>
      </media-fullscreen-button>
      <media-tooltip
        id="fullscreen-tooltip"
        class="surface popup-animation"
        popover="manual"
        delay="500"
        side="top"
        side-offset="12"
        collision-padding="12"
      >
        <span class="tooltip fullscreen-enter-tooltip">Enter Fullscreen</span>
        <span class="tooltip fullscreen-exit-tooltip">Exit Fullscreen</span>
      </media-tooltip>
    </div>
  </media-container>
</video-provider>`;
  } else {
    return `<video-provider>
  <media-container>
    <video
      slot="media"
      src="https://stream.mux.com/A3VXy02VoUinw01pwyomEO3bHnG4P32xzV7u1j1FSzjNg/high.mp4"
      playsinline
      poster="https://image.mux.com/A3VXy02VoUinw01pwyomEO3bHnG4P32xzV7u1j1FSzjNg/thumbnail.webp"
    ></video>

    <div class="overlay"></div>

    <div class="control-bar">
      <media-play-button commandfor="play-tooltip" class="button">
        <media-play-icon class="icon play-icon"></media-play-icon>
        <media-pause-icon class="icon pause-icon"></media-pause-icon>
      </media-play-button>
      <media-tooltip
        id="play-tooltip"
        class="popup-animation"
        popover="manual"
        delay="500"
        side="top"
        side-offset="6"
        collision-padding="12"
      >
        <span class="tooltip play-tooltip">Play</span>
        <span class="tooltip pause-tooltip">Pause</span>
      </media-tooltip>

      <div class="time-display-group">
        <!-- Use the show-remaining attribute to show count down/remaining time -->
        <media-current-time-display></media-current-time-display>

        <span class="duration-display">
          /
          <media-duration-display></media-duration-display>
        </span>
      </div>

      <media-time-slider commandfor="time-slider-tooltip" class="slider">
        <media-time-slider-track class="slider-track">
          <media-time-slider-progress class="slider-progress"></media-time-slider-progress>
          <media-time-slider-pointer class="slider-pointer"></media-time-slider-pointer>
        </media-time-slider-track>
        <media-time-slider-thumb class="slider-thumb"></media-time-slider-thumb>
      </media-time-slider>
      <media-tooltip
        id="time-slider-tooltip"
        class="popup-animation"
        popover="manual"
        track-cursor-axis="x"
        side="top"
        side-offset="12"
        collision-padding="12"
      >
        <media-preview-time-display></media-preview-time-display>
      </media-tooltip>

      <div class="button-group">
        <media-mute-button commandfor="volume-slider-popover" command="toggle-popover" class="button">
          <media-volume-high-icon class="icon volume-high-icon"></media-volume-high-icon>
          <media-volume-low-icon class="icon volume-low-icon"></media-volume-low-icon>
          <media-volume-off-icon class="icon volume-off-icon"></media-volume-off-icon>
        </media-mute-button>
        <media-popover
          id="volume-slider-popover"
          class="popup-animation"
          popover="manual"
          open-on-hover
          delay="200"
          close-delay="100"
          side="top"
          side-offset="2"
          collision-padding="12"
        >
          <media-volume-slider class="slider" orientation="vertical">
            <media-volume-slider-track class="slider-track">
              <media-volume-slider-indicator class="slider-progress"></media-volume-slider-indicator>
            </media-volume-slider-track>
            <media-volume-slider-thumb class="slider-thumb"></media-volume-slider-thumb>
          </media-volume-slider>
        </media-popover>

        <media-fullscreen-button commandfor="fullscreen-tooltip" class="button">
          <media-fullscreen-enter-alt-icon class="icon fullscreen-enter-icon"></media-fullscreen-enter-alt-icon>
          <media-fullscreen-exit-alt-icon class="icon fullscreen-exit-icon"></media-fullscreen-exit-alt-icon>
        </media-fullscreen-button>
        <media-tooltip
          id="fullscreen-tooltip"
          class="popup-animation"
          popover="manual"
          delay="500"
          side="top"
          side-offset="6"
          collision-padding="12"
        >
          <span class="tooltip fullscreen-enter-tooltip">Enter Fullscreen</span>
          <span class="tooltip fullscreen-exit-tooltip">Exit Fullscreen</span>
        </media-tooltip>
      </div>
    </div>
  </media-container>
</video-provider>`;
  }
}

/**
 * Generate HTML CSS code for the specified skin.
 */
export function generateHTMLCSS(skin: Skin): string {
  // HTML CSS is nearly identical to React CSS, with just element selectors instead of class selectors
  if (skin === 'frosted') {
    return `media-container * {
  box-sizing: border-box;
}

media-container {
  position: relative;
  isolation: isolate;
  container: root / inline-size;
  overflow: clip;
  font-size: 0.8125rem;
  line-height: 1.5;
  border-radius: inherit;
  background: oklab(0 0 0);
}
media-container::before,
media-container::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
  z-index: 10;
}
media-container::before {
  inset: 1px;
  box-shadow: inset 0 0 0 1px oklab(1 0 0 / 0.15);
}
media-container::after {
  inset: 0;
  box-shadow: inset 0 0 0 1px oklab(0 0 0 / 0.1);
}

/* Fullscreen */
media-container:fullscreen {
  border-radius: 0;
}

media-container > ::slotted([slot='media']),
media-container > video,
media-container > audio {
  display: block;
  width: 100%;
  height: 100%;
}

/* Media Container UI Overlay Styling */
media-container > .overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-flow: column nowrap;
  align-items: start;
  pointer-events: none;
  border-radius: inherit;
  background-image: linear-gradient(to top, oklab(0 0 0 / 0.5), oklab(0 0 0 / 0.3), rgba(0, 0, 0, 0));
  backdrop-filter: saturate(1.5) brightness(0.9);
  transition: opacity 0.15s ease-out;
  transition-delay: 500ms;
  opacity: 0;
}
media-container:hover > .overlay,
media-container:has([data-paused]) > .overlay,
media-container:has([aria-expanded='true']) > .overlay {
  opacity: 1;
  transition-duration: 100ms;
  transition-delay: 0ms;
}

/* Common Surface Styles - e.g. tooltips, popovers, controls */
.surface {
  background-color: oklab(1 0 0 / 0.1);
  backdrop-filter: blur(64px) brightness(0.9) saturate(1.5);
  box-shadow:
    inset 0 0 0 1px oklab(1 0 0 / 0.15),
    0 0 0 1px oklab(0 0 0 / 0.15),
    oklab(0 0 0 / 0.15) 0px 1px 3px 0px,
    oklab(0 0 0 / 0.15) 0px 1px 2px -1px;
}
@media (prefers-reduced-transparency: reduce) {
  .surface {
    background-color: oklab(0 0 0 / 0.7);
    box-shadow:
      inset 0 0 0 1px oklab(0 0 0),
      0 0 0 1px oklab(1 0 0 / 0.2);
  }
}
@media (prefers-contrast: more) {
  .surface {
    background-color: oklab(0 0 0 / 0.9);
    box-shadow:
      inset 0 0 0 1px oklab(0 0 0),
      0 0 0 1px oklab(1 0 0 / 0.2);
  }
}

/* Media Control Bar UI/Styles */
.control-bar {
  position: absolute;
  bottom: 0.75rem;
  inset-inline: 0.75rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.125rem;
  border-radius: calc(infinity * 1px);
  will-change: scale, transform, filter, opacity;
  scale: 0.9;
  opacity: 0;
  filter: blur(8px);
  transition-property: scale, transform, filter, opacity;
  transition-delay: 500ms;
  transition-duration: 300ms;
  transition-timing-function: ease-out;
  transform-origin: bottom;
  color: oklab(1 0 0);
}
media-container:hover > .control-bar,
media-container:has([data-paused]) > .control-bar,
media-container:has([aria-expanded='true']) > .control-bar {
  opacity: 1;
  scale: 1;
  filter: blur(0px);
  transition-delay: 0ms;
  transition-duration: 100ms;
}

/* Time Display Styling */
.time-controls {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0.75rem;
  padding-inline: 0.375rem;
}
media-current-time-display,
media-duration-display {
  text-shadow: 0 1px 0 oklab(0 0 0 / 0.25);
  font-variant-numeric: tabular-nums;
}

/* Generic Media Button Styling */
.button {
  display: grid;
  flex-shrink: 0;
  padding: 0.5rem;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: calc(infinity * 1px);
  color: oklab(1 0 0 / 0.9);
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition-property: background-color, color, outline-offset;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.button:hover,
.button:focus-visible,
.button[aria-expanded='true'] {
  background-color: oklab(1 0 0 / 0.1);
  color: oklab(1 0 0);
  text-decoration: none;
}
.button:focus-visible {
  outline-color: oklch(62.3% 0.214 259.815);
  outline-offset: 2px;
}
.button[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(1);
}

.button .icon {
  grid-area: 1 / 1;
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 1px 0 oklab(0 0 0 / 0.25));
}

/* Media Play Button UI/Styles */
media-play-button .icon {
  opacity: 0;
  transition: opacity 150ms linear;
}

media-play-button:not([data-paused]) .pause-icon,
media-play-button[data-paused] .play-icon {
  opacity: 1;
}

/* Media Fullscreen Button UI/Styles */
media-fullscreen-button .icon {
  display: none;
}
media-fullscreen-button:not([data-fullscreen]) .fullscreen-enter-icon,
media-fullscreen-button[data-fullscreen] .fullscreen-exit-icon {
  display: inline;
}

/* One way to define the "default visible" icon (CJP) */
media-mute-button .icon {
  display: none;
}
media-mute-button:not([data-volume-level]) .volume-low-icon,
media-mute-button[data-volume-level='high'] .volume-high-icon,
media-mute-button[data-volume-level='low'] .volume-low-icon,
media-mute-button[data-volume-level='medium'] .volume-low-icon,
media-mute-button[data-volume-level='off'] .volume-off-icon {
  display: inline;
}

/* TimeSlider Component Styles */
.slider {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: calc(infinity * 1px);
  outline: none;
}

/* Horizontal orientation styles */
.slider[data-orientation='horizontal'] {
  min-width: 5rem;
  width: 100%;
  height: 1.25rem;
}

/* Vertical orientation styles */
.slider[data-orientation='vertical'] {
  height: 5rem;
  width: 1.25rem;
}

.slider-track {
  position: relative;
  isolation: isolate;
  background-color: oklab(1 0 0 / 0.2);
  border-radius: inherit;
  overflow: hidden;
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition: outline-offset 150ms ease-out;
  box-shadow: 0 0 0 1px oklab(0 0 0 / 0.05);
}

/* Horizontal track styles */
.slider-track[data-orientation='horizontal'] {
  width: 100%;
  height: 0.25rem;
}

/* Vertical track styles */
.slider-track[data-orientation='vertical'] {
  width: 0.25rem;
  height: 100%;
}

.slider:focus-visible .slider-track {
  outline-color: oklch(62.3% 0.214 259.815);
  outline-offset: 6px;
}

.slider-thumb {
  width: 0.625rem;
  height: 0.625rem;
  background-color: oklab(1 0 0);
  border-radius: calc(infinity * 1px);
  user-select: none;
  z-index: 10;
  box-shadow:
    0 0 0 1px oklab(0 0 0 / 0.1),
    0 1px 3px 0 oklab(0 0 0 / 0.15),
    0 1px 2px -1px oklab(0 0 0 / 0.15);
  opacity: 0;
  transition-property: opacity, height, width;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.slider-thumb:active {
  width: 0.75rem;
  height: 0.75rem;
}
.slider:hover .slider-thumb,
.slider:focus-within .slider-thumb {
  opacity: 1;
}
.slider-track[data-orientation='horizontal'] .slider-thumb {
  cursor: ew-resize;
}
.slider-track[data-orientation='vertical'] .slider-thumb {
  cursor: ns-resize;
}

.slider-pointer {
  background-color: oklab(1 0 0 / 0.2);
  border-radius: inherit;
}

.slider-progress {
  background-color: oklab(1 0 0);
  border-radius: inherit;
}

media-preview-time-display {
  font-variant-numeric: tabular-nums;
}

.popup-animation {
  transition-property: transform, scale, opacity, filter;
  transition-duration: 200ms;
  transform: scale(1);
  transform-origin: bottom;
  opacity: 1;
  filter: blur(0px);
}
.popup-animation[data-starting-style],
.popup-animation[data-ending-style] {
  transform: scale(0);
  opacity: 0;
  filter: blur(8px);
}
.popup-animation[data-instant] {
  transition-duration: 0ms;
}

media-popover {
  margin: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0.75rem 0.25rem;
  border-radius: calc(infinity * 1px);
}

/* Tooltip Component Styles */
media-tooltip {
  margin: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  color: oklab(1 0 0);
  padding: 0.25rem 0.625rem;
  border-radius: calc(infinity * 1px);
  font-size: 0.75rem;
}

.tooltip {
  display: none;
  white-space: nowrap;
}

[data-paused] + media-tooltip .play-tooltip,
:not([data-paused]) + media-tooltip .pause-tooltip {
  display: block;
}

[data-fullscreen] + media-tooltip .fullscreen-exit-tooltip,
:not([data-fullscreen]) + media-tooltip .fullscreen-enter-tooltip {
  display: block;
}`;
  } else {
    return `media-container * {
  box-sizing: border-box;
}

media-container {
  position: relative;
  isolation: isolate;
  container: root / inline-size;
  overflow: clip;
  font-size: 0.8125rem;
  line-height: 1.5;
  border-radius: inherit;
  background: oklab(0 0 0);
}
media-container::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
  z-index: 10;
  inset: 0;
  box-shadow: inset 0 0 0 1px oklab(0 0 0 / 0.2);
}
@media (prefers-color-scheme: dark) {
  media-container::after {
    box-shadow: inset 0 0 0 1px oklab(1 0 0 / 0.2);
  }
}

/* Fullscreen */
media-container:fullscreen {
  border-radius: 0;
}

media-container > ::slotted([slot='media']),
media-container > video,
media-container > audio {
  display: block;
  width: 100%;
  height: 100%;
}

/* Media Container UI Overlay Styling */
media-container > .overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-flow: column nowrap;
  align-items: start;
  pointer-events: none;
  border-radius: inherit;
  background-image: linear-gradient(to top, oklab(0 0 0 / 0.7), oklab(0 0 0 / 0.5) 7.5rem, rgba(0, 0, 0, 0));
  transform: translateY(100%);
  transition-property: transform, opacity;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  transition-delay: 500ms;
  opacity: 0;
}
media-container:hover > .overlay,
media-container:has([data-paused]) > .overlay,
media-container:has([aria-expanded='true']) > .overlay {
  opacity: 1;
  transform: translateY(0);
  transition-duration: 100ms;
  transition-delay: 0ms;
}

/* Media Control Bar UI/Styles */
.control-bar {
  position: absolute;
  bottom: 0;
  inset-inline: 0;
  padding: 2.5rem 0.75rem 0.75rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  will-change: transform, filter, opacity;
  transform: translateY(100%);
  opacity: 0;
  filter: blur(8px);
  transition-property: transform, filter, opacity;
  transition-delay: 500ms;
  transition-duration: 300ms;
  transition-timing-function: ease-out;
  color: oklab(1 0 0);
}
media-container:hover > .control-bar,
media-container:has([data-paused]) > .control-bar,
media-container:has([aria-expanded='true']) > .control-bar {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0px);
  transition-delay: 0ms;
  transition-duration: 100ms;
}

/* Time Display Styling */
.time-display-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.duration-display {
  display: contents;
  color: oklab(1 0 0 / 0.5);
}
media-current-time-display,
media-duration-display {
  text-shadow: 0 1px 0 oklab(0 0 0 / 0.2);
  font-variant-numeric: tabular-nums;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

/* Generic Media Button Styling */
.button {
  display: grid;
  flex-shrink: 0;
  padding: 0.625rem;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: oklab(1 0 0);
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition-property: background-color, color, outline-offset;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.button:hover,
.button:focus-visible,
.button[aria-expanded='true'] {
  color: oklab(1 0 0 / 0.8);
  text-decoration: none;
}
.button:focus-visible {
  outline-color: oklab(1 0 0);
  outline-offset: 2px;
}
.button[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(1);
}

.button .icon {
  grid-area: 1 / 1;
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 1px 0 oklab(0 0 0 / 0.4));
}

/* Media Play Button UI/Styles */
media-play-button .icon {
  opacity: 0;
  transition: opacity 150ms linear;
}

media-play-button:not([data-paused]) .pause-icon,
media-play-button[data-paused] .play-icon {
  opacity: 1;
}

/* Media Fullscreen Button UI/Styles */
media-fullscreen-button .icon {
  display: none;
}
media-fullscreen-button:not([data-fullscreen]) .fullscreen-enter-icon,
media-fullscreen-button[data-fullscreen] .fullscreen-exit-icon {
  display: inline;
}

/* One way to define the "default visible" icon (CJP) */
media-mute-button .icon {
  display: none;
}
media-mute-button:not([data-volume-level]) .volume-low-icon,
media-mute-button[data-volume-level='high'] .volume-high-icon,
media-mute-button[data-volume-level='low'] .volume-low-icon,
media-mute-button[data-volume-level='medium'] .volume-low-icon,
media-mute-button[data-volume-level='off'] .volume-off-icon {
  display: inline;
}

/* TimeSlider Component Styles */
.slider {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: calc(infinity * 1px);
  outline: none;
}

/* Horizontal orientation styles */
.slider[data-orientation='horizontal'] {
  min-width: 5rem;
  width: 100%;
  height: 1.25rem;
}

/* Vertical orientation styles */
.slider[data-orientation='vertical'] {
  height: 4.5rem;
  width: 1.25rem;
}

.slider-track {
  position: relative;
  isolation: isolate;
  background-color: oklab(1 0 0 / 0.2);
  border-radius: inherit;
  overflow: hidden;
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition: outline-offset 150ms ease-out;
  box-shadow: 0 0 0 1px oklab(0 0 0 / 0.05);
}

/* Horizontal track styles */
.slider-track[data-orientation='horizontal'] {
  width: 100%;
  height: 0.1875rem;
}

/* Vertical track styles */
.slider-track[data-orientation='vertical'] {
  width: 0.1875rem;
  height: 100%;
}

.slider:focus-visible .slider-track {
  outline-color: oklab(1 0 0);
  outline-offset: 6px;
}

.slider-thumb {
  width: 0.75rem;
  height: 0.75rem;
  background-color: oklab(1 0 0);
  border-radius: calc(infinity * 1px);
  user-select: none;
  z-index: 10;
  box-shadow:
    0 0 0 1px oklab(0 0 0 / 0.1),
    0 1px 3px 0 oklab(0 0 0 / 0.15),
    0 1px 2px -1px oklab(0 0 0 / 0.15);
  opacity: 0;
  scale: 0.7;
  transform-origin: center;
  transition-property: opacity, scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.slider:hover .slider-thumb,
.slider:focus-within .slider-thumb {
  opacity: 1;
  scale: 1;
}
.slider-track[data-orientation='horizontal'] .slider-thumb {
  cursor: ew-resize;
}
.slider-track[data-orientation='vertical'] .slider-thumb {
  cursor: ns-resize;
}

.slider-pointer {
  display: none;
}

.slider-progress {
  background-color: oklab(1 0 0);
  border-radius: inherit;
}

media-preview-time-display {
  font-variant-numeric: tabular-nums;
}

.popup-animation {
  transition-property: transform, scale, opacity, filter;
  transition-duration: 200ms;
  transform: scale(1);
  transform-origin: bottom;
  opacity: 1;
  filter: blur(0px);
}
.popup-animation[data-starting-style],
.popup-animation[data-ending-style] {
  transform: scale(0);
  opacity: 0;
  filter: blur(8px);
}
.popup-animation[data-instant] {
  transition-duration: 0ms;
}

media-popover {
  margin: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0.75rem 0.25rem;
  border-radius: calc(infinity * 1px);
}

/* Tooltip Component Styles */
media-tooltip {
  margin: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  color: oklab(1 0 0);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  background-color: oklab(1 0 0 / 0.1);
  backdrop-filter: blur(64px) brightness(0.9) saturate(1.5);
  box-shadow:
    0 4px 6px -1px oklab(0 0 0 / 0.1),
    0 2px 4px -2px oklab(0 0 0 / 0.1);
}
@media (prefers-reduced-transparency: reduce) {
  media-tooltip {
    background-color: oklab(0 0 0 / 0.7);
  }
}
@media (prefers-contrast: more) {
  media-tooltip {
    background-color: oklab(0 0 0 / 0.9);
  }
}

.tooltip {
  display: none;
  white-space: nowrap;
}

[data-paused] + media-tooltip .play-tooltip,
:not([data-paused]) + media-tooltip .pause-tooltip {
  display: block;
}

[data-fullscreen] + media-tooltip .fullscreen-exit-tooltip,
:not([data-fullscreen]) + media-tooltip .fullscreen-enter-tooltip {
  display: block;
}`;
  }
}

/**
 * Generate HTML JavaScript imports for the specified skin.
 */
export function generateHTMLJS(skin: Skin): string {
  return `import './${skin}.css';

// npm install @videojs/html@next
import '@videojs/html-preview/icons';
// be sure to import video-provider first for proper context initialization
import '@videojs/html-preview/define/video-provider';
import '@videojs/html-preview/define/media-container';
import '@videojs/html-preview/define/media-play-button';
import '@videojs/html-preview/define/media-mute-button';
import '@videojs/html-preview/define/media-volume-slider';
import '@videojs/html-preview/define/media-time-slider';
import '@videojs/html-preview/define/media-fullscreen-button';
import '@videojs/html-preview/define/media-duration-display';
import '@videojs/html-preview/define/media-current-time-display';
import '@videojs/html-preview/define/media-preview-time-display';
import '@videojs/html-preview/define/media-popover';
import '@videojs/html-preview/define/media-tooltip';`;
}
