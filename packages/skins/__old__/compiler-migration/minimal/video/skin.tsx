import {
  BufferingIndicator,
  CaptionsButton,
  CastButton,
  Container,
  Controls,
  ErrorDialog,
  FullscreenButton,
  MuteButton,
  PiPButton,
  PlayButton,
  PlaybackRateButton,
  Popover,
  Poster,
  SeekButton,
  Slider,
  Time,
  TimeSlider,
  Tooltip,
  VolumeSlider,
} from '@videojs/core/components';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  CastEnterIcon,
  CastExitIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/components/minimal';
import { cn } from '@videojs/utils/style';
import { video as defaultStyles } from '../../default/tailwind';
import { video as styles } from '../tailwind';

const SEEK_TIME = 10;

const iconButton = cn(styles.button.base, styles.button.subtle, styles.button.icon);

export interface MinimalVideoSkinProps {
  className?: string;
}

export function MinimalVideoSkin({ className }: MinimalVideoSkinProps) {
  return (
    <Container data-skin="minimal-video" className={cn(styles.root, className)}>
      <Poster className={styles.poster} />

      <BufferingIndicator className={styles.bufferingIndicator}>
        <SpinnerIcon className={styles.icon} />
      </BufferingIndicator>

      <ErrorDialog.Root>
        <ErrorDialog.Popup className={styles.error.root}>
          <div className={styles.error.dialog}>
            <div className={styles.error.content}>
              <ErrorDialog.Title className={styles.error.title}>Something went wrong.</ErrorDialog.Title>
              <ErrorDialog.Description className={styles.error.description} />
            </div>
            <div className={styles.error.actions}>
              <ErrorDialog.Close className={cn(styles.button.base, styles.button.primary)}>OK</ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root className={styles.controls}>
        <Tooltip.Provider>
          <div className={styles.buttonGroupStart}>
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
              <div className={styles.preview.root}>
                <div className={styles.preview.thumbnailWrapper}>
                  <Slider.Thumbnail className={styles.preview.thumbnail} />
                </div>
                <TimeSlider.Value type="pointer" className={styles.preview.time} />
                <SpinnerIcon className={cn(styles.icon, styles.preview.spinner)} />
              </div>
            </TimeSlider.Root>
          </div>

          <div className={styles.buttonGroupEnd}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PlaybackRateButton className={cn(iconButton, defaultStyles.playbackRate.button)} />
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip}>Toggle playback rate</Tooltip.Popup>
            </Tooltip.Root>

            <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
              <Popover.Trigger>
                <MuteButton className={cn(iconButton, 'group')}>
                  <VolumeOffIcon className={cn(styles.icon, 'hidden group-data-[volume-level=off]:block')} />
                  <VolumeLowIcon className={cn(styles.icon, 'hidden group-data-[volume-level=low]:block')} />
                  <VolumeHighIcon className={cn(styles.icon, 'hidden group-data-[volume-level=high]:block')} />
                </MuteButton>
              </Popover.Trigger>
              <Popover.Popup className={styles.popup.volume}>
                <VolumeSlider.Root orientation="vertical" thumbAlignment="edge" className={styles.slider.root}>
                  <VolumeSlider.Track className={styles.slider.track}>
                    <VolumeSlider.Fill className={cn(styles.slider.fill.base, styles.slider.fill.fill)} />
                  </VolumeSlider.Track>
                  <VolumeSlider.Thumb className={styles.slider.thumb.base} />
                </VolumeSlider.Root>
              </Popover.Popup>
            </Popover.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <CaptionsButton className={cn(iconButton, 'group')}>
                  <CaptionsOffIcon className={cn(styles.icon, 'hidden group-not-data-active:block')} />
                  <CaptionsOnIcon className={cn(styles.icon, 'hidden group-data-active:block')} />
                </CaptionsButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip} />
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <CastButton className={cn(iconButton, 'group')}>
                  <CastEnterIcon className={cn(styles.icon, 'hidden group-not-data-[cast-state=connected]:block')} />
                  <CastExitIcon className={cn(styles.icon, 'hidden group-data-[cast-state=connected]:block')} />
                </CastButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip} />
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PiPButton className={cn(iconButton, 'group')}>
                  <PipEnterIcon className={cn(styles.icon, 'hidden group-not-data-pip:block')} />
                  <PipExitIcon className={cn(styles.icon, 'hidden group-data-pip:block')} />
                </PiPButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip} />
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <FullscreenButton className={cn(iconButton, 'group')}>
                  <FullscreenEnterIcon className={cn(styles.icon, 'hidden group-not-data-fullscreen:block')} />
                  <FullscreenExitIcon className={cn(styles.icon, 'hidden group-data-fullscreen:block')} />
                </FullscreenButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={styles.popup.tooltip} />
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      </Controls.Root>

      <div className={styles.overlay} />
    </Container>
  );
}
