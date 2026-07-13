import {
  AirPlayButton,
  BufferingIndicator,
  CastButton,
  Container,
  Controls,
  ErrorDialog,
  FeatureAvailability,
  FullscreenButton,
  Gesture,
  Hotkey,
  MuteButton,
  Overlay,
  PiPButton,
  PlayButton,
  Popover,
  Poster,
  SeekButton,
  SeekIndicator,
  Slider,
  StatusAnnouncer,
  StatusIndicator,
  Text,
  Time,
  TimeSlider,
  Tooltip,
  VolumeIndicator,
  VolumeSlider,
} from '@videojs/core/components';
import {
  AirPlayEnterIcon,
  AirPlayExitIcon,
  CaptionsOffIcon,
  CaptionsOnIcon,
  CastEnterIcon,
  CastExitIcon,
  ChevronIcon,
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
} from '@videojs/icons/components';
import {
  buffering,
  button,
  container,
  controls,
  controlsGroup,
  error,
  icons,
  indicator,
  overlay,
  popover,
  seek,
  seekIndicator,
  slider,
  spinner,
  statusIndicator,
  time,
  tooltip,
  volumeIndicator,
  volumePopover,
} from './tailwind/video.tailwind';

const SEEK_TIME = 10;
const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;
const CENTER_STATUS_ACTIONS = ['togglePaused'] as const;
const iconButton = [button.base, button.subtle, button.icon];

export interface DefaultVideoSkinProps {
  className?: string;
  children?: unknown;
}

function MuteControl() {
  return (
    <MuteButton className={[iconButton, icons.muteButtonState]}>
      <VolumeOffIcon className={[icons.root, icons.volumeOffIcon]} />
      <VolumeLowIcon className={[icons.root, icons.volumeLowIcon]} />
      <VolumeHighIcon className={[icons.root, icons.volumeHighIcon]} />
    </MuteButton>
  );
}

export function DefaultVideoSkin({ className, children }: DefaultVideoSkinProps) {
  return (
    <Container className={[container, className]}>
      {children}

      <Poster />

      <BufferingIndicator className={buffering.root}>
        <SpinnerIcon className={icons.root} />
      </BufferingIndicator>

      <ErrorDialog.Root>
        <ErrorDialog.Popup className={error.root}>
          <ErrorDialog.Title className={error.title}>Something went wrong.</ErrorDialog.Title>
          <ErrorDialog.Description className={error.description} />
          <ErrorDialog.Close className={[button.base, button.primary, error.close]}>OK</ErrorDialog.Close>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root className={controls}>
        <Tooltip.Provider>
          <Controls.Group className={controlsGroup.start}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PlayButton className={[iconButton, icons.playButtonState]}>
                  <RestartIcon className={[icons.root, icons.restartIcon]} />
                  <PlayIcon className={[icons.root, icons.playIcon]} />
                  <PauseIcon className={[icons.root, icons.pauseIcon]} />
                </PlayButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={-SEEK_TIME} className={[iconButton, seek.button]}>
                  <SeekIcon className={[icons.root, icons.seekBackwardIcon]} />
                  <Text className={[seek.label, seek.labelBackward]}>{SEEK_TIME}</Text>
                </SeekButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={SEEK_TIME} className={[iconButton, seek.button]}>
                  <SeekIcon className={icons.root} />
                  <Text className={[seek.label, seek.labelForward]}>{SEEK_TIME}</Text>
                </SeekButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>
          </Controls.Group>

          <Time.Group className={time.group}>
            <Time.Value type="current" className={time.current} />
            <TimeSlider.Root className={slider.root}>
              <TimeSlider.Track className={slider.track}>
                <TimeSlider.Fill className={[slider.fillBase, slider.fill]} />
                <TimeSlider.Buffer className={[slider.fillBase, slider.buffer]} />
              </TimeSlider.Track>
              <TimeSlider.Thumb className={[slider.thumbBase, slider.thumb]} />
              <Slider.Thumbnail.Root className={slider.thumbnail}>
                <Slider.Thumbnail.Image className={slider.thumbnailImage} />
                <TimeSlider.Value type="pointer" className={slider.thumbnailTime} />
                <SpinnerIcon className={[icons.root, spinner.root]} />
              </Slider.Thumbnail.Root>
              <TimeSlider.Preview className={slider.preview}>
                <TimeSlider.Value type="pointer" className={slider.value} />
              </TimeSlider.Preview>
            </TimeSlider.Root>
            <Time.Value type="duration" className={time.duration} />
          </Time.Group>

          <Controls.Group className={controlsGroup.end}>
            <FeatureAvailability is="volume" when="unsupported">
              <MuteControl />
            </FeatureAvailability>
            <FeatureAvailability is="volume" except="unsupported">
              <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
                <Popover.Trigger>
                  <MuteControl />
                </Popover.Trigger>
                <Popover.Popup className={[popover.root, volumePopover.root]}>
                  <VolumeSlider.Root orientation="vertical" thumbAlignment="edge" className={slider.root}>
                    <VolumeSlider.Track className={slider.track}>
                      <VolumeSlider.Fill className={[slider.fillBase, slider.fill]} />
                    </VolumeSlider.Track>
                    <VolumeSlider.Thumb className={[slider.thumbBase, slider.thumbPersistent]} />
                  </VolumeSlider.Root>
                </Popover.Popup>
              </Popover.Root>
            </FeatureAvailability>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <CastButton className={[iconButton, icons.castButtonState]}>
                  <CastEnterIcon className={[icons.root, icons.castEnterIcon]} />
                  <CastExitIcon className={[icons.root, icons.castExitIcon]} />
                </CastButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <AirPlayButton className={[iconButton, icons.airplayButtonState]}>
                  <AirPlayEnterIcon className={[icons.root, icons.airplayEnterIcon]} />
                  <AirPlayExitIcon className={[icons.root, icons.airplayExitIcon]} />
                </AirPlayButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PiPButton className={[iconButton, icons.pipButtonState]}>
                  <PipEnterIcon className={[icons.root, icons.pipEnterIcon]} />
                  <PipExitIcon className={[icons.root, icons.pipExitIcon]} />
                </PiPButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <FullscreenButton className={[iconButton, icons.fullscreenButtonState]}>
                  <FullscreenEnterIcon className={[icons.root, icons.fullscreenEnterIcon]} />
                  <FullscreenExitIcon className={[icons.root, icons.fullscreenExitIcon]} />
                </FullscreenButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Root>

      <Overlay className={overlay} />

      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="c" action="toggleSubtitles" />
      <Hotkey keys="i" action="togglePictureInPicture" />
      <Hotkey keys="ArrowRight" action="seekStep" value={SEEK_TIME / 2} />
      <Hotkey keys="ArrowLeft" action="seekStep" value={-(SEEK_TIME / 2)} />
      <Hotkey keys="l" action="seekStep" value={SEEK_TIME} />
      <Hotkey keys="j" action="seekStep" value={-SEEK_TIME} />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />
      <Hotkey keys="0-9" action="seekToPercent" />
      <Hotkey keys="Home" action="seekToPercent" value={0} />
      <Hotkey keys="End" action="seekToPercent" value={100} />
      <Hotkey keys=">" action="speedUp" />
      <Hotkey keys="<" action="speedDown" />

      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="seekStep" value={-SEEK_TIME} region="left" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />
      <Gesture type="doubletap" action="seekStep" value={SEEK_TIME} region="right" />

      <StatusAnnouncer />

      <VolumeIndicator.Root className={volumeIndicator.root}>
        <VolumeIndicator.Fill className={indicator.content}>
          <VolumeHighIcon className={[volumeIndicator.icon, volumeIndicator.highIcon]} />
          <VolumeLowIcon className={[volumeIndicator.icon, volumeIndicator.lowIcon]} />
          <VolumeOffIcon className={[volumeIndicator.icon, volumeIndicator.offIcon]} />
          <VolumeIndicator.Value className={indicator.value} />
        </VolumeIndicator.Fill>
      </VolumeIndicator.Root>

      <StatusIndicator.Root actions={TOP_STATUS_ACTIONS} className={statusIndicator.top}>
        <CaptionsOnIcon className={[statusIndicator.topIcon, statusIndicator.captionsOnIcon]} />
        <CaptionsOffIcon className={[statusIndicator.topIcon, statusIndicator.captionsOffIcon]} />
        <FullscreenEnterIcon className={[statusIndicator.topIcon, statusIndicator.fullscreenEnterIcon]} />
        <FullscreenExitIcon className={[statusIndicator.topIcon, statusIndicator.fullscreenExitIcon]} />
        <PipEnterIcon className={[statusIndicator.topIcon, statusIndicator.pipEnterIcon]} />
        <PipExitIcon className={[statusIndicator.topIcon, statusIndicator.pipExitIcon]} />
        <StatusIndicator.Value className={indicator.value} />
      </StatusIndicator.Root>

      <SeekIndicator.Root className={seekIndicator.root}>
        <ChevronIcon className={seekIndicator.icon} />
        <SeekIndicator.Value className={seekIndicator.value} />
      </SeekIndicator.Root>

      <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className={statusIndicator.center}>
        <PlayIcon className={[statusIndicator.centerIcon, statusIndicator.playIcon]} />
        <PauseIcon className={[statusIndicator.centerIcon, statusIndicator.pauseIcon]} />
      </StatusIndicator.Root>
    </Container>
  );
}
