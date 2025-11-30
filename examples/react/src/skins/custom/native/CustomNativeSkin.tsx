import type { PropsWithChildren } from 'react';

import {
  CurrentTimeDisplay,
  DurationDisplay,
  FullscreenButton,
  MediaContainer,
  MuteButton,
  PlayButton,
  // Popover,
  // PreviewTimeDisplay,
  TimeSlider,
  // Tooltip,
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

export default function CustomNativeSkin({ children, className = '' }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={`${styles.MediaContainer} ${className}`}>
      {children}

      <div className={styles.Controls}>
        {/* <header className='py-2 px-2.5 text-shadow-sm text-shadow-black/10'>
          <h1 className="text-base font-medium">Example Video</h1>
          <p className="text-stone-400">This is just a description for the example video.</p>
        </header> */}

        <div className={styles.ControlsRow}>
          <TimeSlider.Root className={styles.SliderRoot}>
            <TimeSlider.Track className={styles.SliderTrack}>
              <TimeSlider.Progress className={styles.SliderProgress} />
              <TimeSlider.Pointer className={styles.SliderPointer} />
            </TimeSlider.Track>
            <TimeSlider.Thumb className={`${styles.SliderThumb} ${styles.TimeSliderThumb}`} />
          </TimeSlider.Root>
        </div>

        <div className={styles.ControlsRow}>
          <div className="flex items-center gap-3">
            <PlayButton className={`${styles.Button} ${styles.IconButton} ${styles.PlayButton}`}>
              <PlayIcon className={styles.PlayIcon}></PlayIcon>
              <PauseIcon className={styles.PauseIcon}></PauseIcon>
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
          </div>

          <div className="flex items-center gap-0.5">
            <div className={styles.VolumeControls}>
              <MuteButton className={`${styles.Button} ${styles.IconButton} ${styles.VolumeButton}`}>
                <VolumeHighIcon className={styles.VolumeHighIcon} />
                <VolumeLowIcon className={styles.VolumeLowIcon} />
                <VolumeOffIcon className={styles.VolumeOffIcon} />
              </MuteButton>

              <div className={styles.VolumeSlider}>
                <VolumeSlider.Root className={styles.SliderRoot}>
                  <VolumeSlider.Track className={styles.SliderTrack}>
                    <VolumeSlider.Progress className={styles.SliderProgress} />
                  </VolumeSlider.Track>
                  <VolumeSlider.Thumb className={styles.SliderThumb} />
                </VolumeSlider.Root>
              </div>
            </div>

            <FullscreenButton className={`${styles.Button} ${styles.IconButton} ${styles.FullScreenButton}`}>
              <FullscreenEnterIcon className={styles.FullScreenEnterIcon} />
              <FullscreenExitIcon className={styles.FullScreenExitIcon} />
            </FullscreenButton>
          </div>
        </div>
      </div>
    </MediaContainer>
  );
};
