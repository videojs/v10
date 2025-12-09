/**
 * Frosted Skin
 *
 * Exact copy from packages/react/src/skins/frosted/FrostedSkin.tsx
 * Updated imports to use @videojs/react package exports
 */

import type { PropsWithChildren } from 'react';

import {
  CurrentTimeDisplay,
  DurationDisplay,
  FullscreenButton,
  MediaContainer,
  MuteButton,
  PlayButton,
  Popover,
  PreviewTimeDisplay,
  TimeSlider,
  Tooltip,
  VolumeSlider,
} from '@videojs/react';

import {
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react/icons';

import styles from './styles';

type SkinProps = PropsWithChildren<{
  className?: string;
}>;

export default function FrostedSkin({ children, className = '' }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={`${styles.MediaContainer} ${className}`}>
      {children}

      <div className={styles.Overlay} />

      <div className={`${styles.Surface} ${styles.Controls}`} data-testid="media-controls">
        <Tooltip.Root delay={500}>
          <Tooltip.Trigger>
            <PlayButton className={`${styles.Button} ${styles.IconButton} ${styles.PlayButton}`}>
              <PlayIcon className={`${styles.PlayIcon} ${styles.Icon}`} />
              <PauseIcon className={`${styles.PauseIcon} ${styles.Icon}`} />
            </PlayButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner side="top" sideOffset={12} collisionPadding={12}>
            <Tooltip.Popup className={`${styles.TooltipPopup} ${styles.Surface} ${styles.PopupAnimation} ${styles.PlayTooltipPopup}`}>
              <span className={styles.PlayTooltip}>Play</span>
              <span className={styles.PauseTooltip}>Pause</span>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <div className={styles.TimeControls}>
          <CurrentTimeDisplay
            className={styles.TimeDisplay}
          />

          <Tooltip.Root trackCursorAxis="x">
            <Tooltip.Trigger>
              <TimeSlider.Root className={styles.SliderRoot}>
                <TimeSlider.Track className={styles.SliderTrack}>
                  <TimeSlider.Progress className={styles.SliderProgress} />
                  <TimeSlider.Pointer className={styles.SliderPointer} />
                </TimeSlider.Track>
                <TimeSlider.Thumb className={styles.SliderThumb} />
              </TimeSlider.Root>
            </Tooltip.Trigger>
            <Tooltip.Positioner side="top" sideOffset={18} collisionPadding={12}>
              <Tooltip.Popup className={`${styles.Surface} ${styles.PopupAnimation} ${styles.TooltipPopup}`}>
                <PreviewTimeDisplay className={styles.TimeDisplay} />
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Root>

          <DurationDisplay className={styles.TimeDisplay} />
        </div>

        <Popover.Root openOnHover delay={200} closeDelay={100}>
          <Popover.Trigger>
            <MuteButton className={`${styles.Button} ${styles.IconButton} ${styles.MuteButton}`}>
              <VolumeHighIcon className={`${styles.VolumeHighIcon} ${styles.Icon}`} />
              <VolumeLowIcon className={`${styles.VolumeLowIcon} ${styles.Icon}`} />
              <VolumeOffIcon className={`${styles.VolumeOffIcon} ${styles.Icon}`} />
            </MuteButton>
          </Popover.Trigger>
          <Popover.Positioner side="top" sideOffset={12}>
            <Popover.Popup className={`${styles.Surface} ${styles.PopupAnimation} ${styles.PopoverPopup}`}>
              <VolumeSlider.Root className={styles.SliderRoot} orientation="vertical">
                <VolumeSlider.Track className={styles.SliderTrack}>
                  <VolumeSlider.Progress className={styles.SliderProgress} />
                </VolumeSlider.Track>
                <VolumeSlider.Thumb className={styles.SliderThumb} />
              </VolumeSlider.Root>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Root>

        <Tooltip.Root delay={500}>
          <Tooltip.Trigger>
            <FullscreenButton className={`${styles.Button} ${styles.IconButton} ${styles.FullscreenButton}`}>
              <FullscreenEnterIcon className={`${styles.FullscreenEnterIcon} ${styles.Icon}`} />
              <FullscreenExitIcon className={`${styles.FullscreenExitIcon} ${styles.Icon}`} />
            </FullscreenButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner side="top" sideOffset={12} collisionPadding={12}>
            <Tooltip.Popup className={`${styles.Surface} ${styles.PopupAnimation} ${styles.TooltipPopup} ${styles.FullscreenTooltipPopup}`}>
              <span className={styles.FullscreenEnterTooltip}>Enter Fullscreen</span>
              <span className={styles.FullscreenExitTooltip}>Exit Fullscreen</span>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Root>
      </div>
    </MediaContainer>
  );
}
