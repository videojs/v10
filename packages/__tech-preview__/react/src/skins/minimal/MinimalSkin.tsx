import type { PropsWithChildren } from 'react';

import { CurrentTimeDisplay } from '@/components/CurrentTimeDisplay';
import { DurationDisplay } from '@/components/DurationDisplay';
import { FullscreenButton } from '@/components/FullscreenButton';
import { MediaContainer } from '@/components/MediaContainer';
import MuteButton from '@/components/MuteButton';
import PlayButton from '@/components/PlayButton';
import Popover from '@/components/Popover';
import PreviewTimeDisplay from '@/components/PreviewTimeDisplay';
import { TimeSlider } from '@/components/TimeSlider';
import Tooltip from '@/components/Tooltip';
import VolumeSlider from '@/components/VolumeSlider';
import {
  FullscreenEnterAltIcon,
  FullscreenExitAltIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons';
import styles from './styles';

type SkinProps = PropsWithChildren<{
  className?: string;
}>;

export default function MinimalSkin({ children, className = '' }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={`${styles.MediaContainer} ${className}`}>
      {children}

      <div className={styles.Overlay} />

      <div className={styles.Controls}>
        <Tooltip.Root delay={500} closeDelay={0}>
          <Tooltip.Trigger>
            <PlayButton className={`${styles.Button} ${styles.IconButton}`}>
              <PlayIcon className={`${styles.Icon} ${styles.PlayIcon}`} />
              <PauseIcon className={`${styles.Icon} ${styles.PauseIcon}`} />
            </PlayButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner side="top-start" sideOffset={6} collisionPadding={12}>
            <Tooltip.Popup className={`${styles.PopupAnimation} ${styles.TooltipPopup} ${styles.PlayTooltipPopup}`}>
              <span className={styles.PlayTooltip}>Play</span>
              <span className={styles.PauseTooltip}>Pause</span>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <div className={styles.TimeDisplayGroup}>
          <CurrentTimeDisplay
            // Use showRemaining to show count down/remaining time
            // showRemaining
            className={styles.TimeDisplay}
          />

          <span className={styles.DurationDisplay}>
            /
            <DurationDisplay className={`${styles.TimeDisplay}`} />
          </span>
        </div>

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
          <Tooltip.Positioner side="top" sideOffset={12} collisionPadding={12}>
            <Tooltip.Popup className={`${styles.PopupAnimation} ${styles.TooltipPopup}`}>
              <PreviewTimeDisplay className={styles.TimeDisplay} />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <div className={styles.ButtonGroup}>
          <Popover.Root openOnHover delay={200} closeDelay={300}>
            <Popover.Trigger>
              <MuteButton className={`${styles.Button} ${styles.IconButton}`}>
                <VolumeHighIcon className={`${styles.Icon} ${styles.VolumeHighIcon}`} />
                <VolumeLowIcon className={`${styles.Icon} ${styles.VolumeLowIcon}`} />
                <VolumeOffIcon className={`${styles.Icon} ${styles.VolumeOffIcon}`} />
              </MuteButton>
            </Popover.Trigger>
            <Popover.Positioner side="top" sideOffset={2}>
              <Popover.Popup className={`${styles.PopupAnimation} ${styles.PopoverPopup}`}>
                <VolumeSlider.Root className={styles.SliderRoot} orientation="vertical">
                  <VolumeSlider.Track className={styles.SliderTrack}>
                    <VolumeSlider.Progress className={styles.SliderProgress} />
                  </VolumeSlider.Track>
                  <VolumeSlider.Thumb className={styles.SliderThumb} />
                </VolumeSlider.Root>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Root>

          <Tooltip.Root delay={500} closeDelay={0}>
            <Tooltip.Trigger>
              <FullscreenButton className={`${styles.Button} ${styles.IconButton}`}>
                <FullscreenEnterAltIcon className={`${styles.Icon} ${styles.FullscreenEnterIcon}`} />
                <FullscreenExitAltIcon className={`${styles.Icon} ${styles.FullscreenExitIcon}`} />
              </FullscreenButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner side="top-end" sideOffset={6} collisionPadding={12}>
              <Tooltip.Popup className={`${styles.PopupAnimation} ${styles.TooltipPopup} ${styles.FullscreenTooltipPopup}`}>
                <span className={styles.FullscreenEnterTooltip}>Enter Fullscreen</span>
                <span className={styles.FullscreenExitTooltip}>Exit Fullscreen</span>
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </div>
      </div>
    </MediaContainer>
  );
}
