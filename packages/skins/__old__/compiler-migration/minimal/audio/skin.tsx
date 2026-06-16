import {
  Container,
  ErrorDialog,
  MuteButton,
  PlayButton,
  PlaybackRateButton,
  Popover,
  SeekButton,
  Time,
  TimeSlider,
  Tooltip,
  VolumeSlider,
} from '@videojs/core/components';
import {
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/components/minimal';
import { cn } from '@videojs/utils/style';
import { audio as defaultStyles } from '../../default/tailwind';
import { audio as styles } from '../tailwind';

const SEEK_TIME = 10;

const iconButton = cn(styles.button.base, styles.button.subtle, styles.button.icon);

export interface MinimalAudioSkinProps {
  className?: string;
}

export function MinimalAudioSkin({ className }: MinimalAudioSkinProps) {
  return (
    <Container data-skin="minimal-audio" className={cn(styles.root, className)}>
      <ErrorDialog.Root>
        <ErrorDialog.Popup className={styles.error.root}>
          <div className={styles.error.dialog}>
            <div className={styles.error.content}>
              <ErrorDialog.Title className={styles.error.title}>Something went wrong.</ErrorDialog.Title>
              <ErrorDialog.Description className={styles.error.description} />
            </div>
            <div className={styles.error.actions}>
              <ErrorDialog.Close className={cn(styles.button.base, styles.button.subtle)}>OK</ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <div className={styles.controls}>
        <Tooltip.Provider>
          <div className={styles.buttonGroup}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PlayButton className={cn(iconButton, 'group')}>
                  <RestartIcon className={cn(styles.icon, 'hidden group-data-ended:block')} />
                  <PlayIcon className={cn(styles.icon, 'hidden group-not-data-ended:group-data-paused:block')} />
                  <PauseIcon className={cn(styles.icon, 'hidden group-not-data-paused:group-not-data-ended:block')} />
                </PlayButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip} />
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={-SEEK_TIME} className={iconButton}>
                  <span className={styles.iconContainer}>
                    <SeekIcon className={cn(styles.icon, styles.iconFlipped)} />
                    <span className={styles.seek.labelBackward}>{SEEK_TIME}</span>
                  </span>
                </SeekButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip}>Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={SEEK_TIME} className={iconButton}>
                  <span className={styles.iconContainer}>
                    <SeekIcon className={styles.icon} />
                    <span className={styles.seek.labelForward}>{SEEK_TIME}</span>
                  </span>
                </SeekButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip}>Seek forward {SEEK_TIME} seconds</Tooltip.Popup>
            </Tooltip.Root>
          </div>

          <div className={styles.time.controls}>
            <Time.Group className={styles.time.group}>
              <Time.Value type="current" className={styles.time.current} />
              <Time.Separator className={styles.time.separator} />
              <Time.Value type="duration" className={styles.time.duration} />
            </Time.Group>

            <TimeSlider.Root className={styles.slider.root}>
              <TimeSlider.Track className={styles.slider.track}>
                <TimeSlider.Fill className={cn(styles.slider.fill.base, styles.slider.fill.fill)} />
                <TimeSlider.Buffer className={cn(styles.slider.fill.base, styles.slider.fill.buffer)} />
              </TimeSlider.Track>
              <TimeSlider.Thumb className={cn(styles.slider.thumb.base, styles.slider.thumb.interactive)} />
            </TimeSlider.Root>
          </div>

          <div className={styles.buttonGroup}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PlaybackRateButton className={cn(iconButton, defaultStyles.playbackRate.button)} />
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip}>Toggle playback rate</Tooltip.Popup>
            </Tooltip.Root>

            <Popover.Root openOnHover delay={200} closeDelay={100} side="left">
              <Popover.Trigger>
                <MuteButton className={cn(iconButton, 'group')}>
                  <VolumeOffIcon className={cn(styles.icon, 'hidden group-data-[volume-level=off]:block')} />
                  <VolumeLowIcon className={cn(styles.icon, 'hidden group-data-[volume-level=low]:block')} />
                  <VolumeHighIcon className={cn(styles.icon, 'hidden group-data-[volume-level=high]:block')} />
                </MuteButton>
              </Popover.Trigger>
              <Popover.Popup className={styles.popup.volume}>
                <VolumeSlider.Root orientation="horizontal" thumbAlignment="edge" className={styles.slider.root}>
                  <VolumeSlider.Track className={styles.slider.track}>
                    <VolumeSlider.Fill className={cn(styles.slider.fill.base, styles.slider.fill.fill)} />
                  </VolumeSlider.Track>
                  <VolumeSlider.Thumb className={styles.slider.thumb.base} />
                </VolumeSlider.Root>
              </Popover.Popup>
            </Popover.Root>
          </div>
        </Tooltip.Provider>
      </div>
    </Container>
  );
}
