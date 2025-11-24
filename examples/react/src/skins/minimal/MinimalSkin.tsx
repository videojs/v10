import type { PropsWithChildren } from 'react';

import {
  CurrentTimeDisplay,
  DurationDisplay,
  FullscreenButton,
  MediaContainer,
  MuteButton,
  PlayButton,
  TimeSlider,
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

export default function MinimalSkin({ children, className = '' }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={`${styles.MediaContainer} ${className}`}>
      {children}

      <div className={styles.Overlay} aria-hidden="true" />

      <div className={styles.Controls}>
        <PlayButton className={`${styles.Button} ${styles.IconButton} ${styles.PlayButton}`}>
          <PlayIcon className={`${styles.PlayIcon} ${styles.Icon}`} />
          <PauseIcon className={`${styles.PauseIcon} ${styles.Icon}`} />
        </PlayButton>

        <div className="flex items-center gap-1">
          <CurrentTimeDisplay
            // Use showRemaining to show count down/remaining time
            // showRemaining
            className={styles.TimeDisplay}
          />
          <span className="opacity-50">/</span>
          <DurationDisplay className={`${styles.TimeDisplay} opacity-50`} />
        </div>

        <TimeSlider.Root className={`${styles.SliderRoot} ${styles.TimeSliderRoot}`}>
          <TimeSlider.Track className={styles.SliderTrack}>
            <TimeSlider.Progress className={styles.SliderProgress} />
            <TimeSlider.Pointer className={styles.SliderPointer} />
          </TimeSlider.Track>
          <TimeSlider.Thumb className={`${styles.SliderThumb} ${styles.TimeSliderThumb}`} />
        </TimeSlider.Root>

        <div className={styles.ButtonGroup}>
          <MuteButton className={`${styles.Button} ${styles.IconButton} ${styles.MuteButton}`}>
            <VolumeHighIcon className={`${styles.VolumeHighIcon} ${styles.Icon}`} />
            <VolumeLowIcon className={`${styles.VolumeLowIcon} ${styles.Icon}`} />
            <VolumeOffIcon className={`${styles.VolumeOffIcon} ${styles.Icon}`} />
          </MuteButton>

          <FullscreenButton className={`${styles.Button} ${styles.IconButton} ${styles.FullscreenButton}`}>
            <FullscreenEnterIcon className={`${styles.FullscreenEnterIcon} ${styles.Icon}`} />
            <FullscreenExitIcon className={`${styles.FullscreenExitIcon} ${styles.Icon}`} />
          </FullscreenButton>
        </div>
      </div>
    </MediaContainer>
  );
}
