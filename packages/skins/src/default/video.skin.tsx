import {
  AirPlayButton,
  BufferingIndicator,
  CastButton,
  Container,
  Controls,
  ErrorDialog,
  FullscreenButton,
  Gesture,
  Hotkey,
  Overlay,
  PiPButton,
  PlayButton,
  Poster,
  SeekButton,
  SeekIndicator,
  StatusAnnouncer,
  StatusIndicator,
  Text,
  Time,
  TimeSlider,
  Tooltip,
  VolumeIndicator,
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
  airplayIcon,
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  castIcon,
  container,
  controls,
  error,
  fullscreenIcon,
  icon,
  iconFlipped,
  inputFeedback,
  overlay,
  pipIcon,
  playIcon,
  popup,
  poster as posterClass,
  seek,
  slider,
  time,
} from './tailwind/video.tailwind';

const SEEK_TIME = 10;
const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;
const CENTER_STATUS_ACTIONS = ['togglePaused'] as const;
const iconButton = [button.base, button.subtle, button.icon];

export interface DefaultVideoSkinProps {
  className?: string;
  children?: unknown;
}

export function DefaultVideoSkin({ className, children }: DefaultVideoSkinProps) {
  return (
    <Container className={[container, className]}>
      {children}

      <Poster className={posterClass} />

      <BufferingIndicator className={bufferingIndicator.root}>
        <SpinnerIcon className={icon} />
      </BufferingIndicator>

      <ErrorDialog.Root>
        <ErrorDialog.Popup className={error.popup}>
          <ErrorDialog.Title className={error.title}>Something went wrong.</ErrorDialog.Title>
          <ErrorDialog.Description className={error.description} />
          <ErrorDialog.Close className={[button.base, button.primary, error.close]}>OK</ErrorDialog.Close>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root className={controls}>
        <Tooltip.Provider>
          <Controls.Group className={buttonGroupStart}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PlayButton className={[iconButton, playIcon.button]}>
                  <RestartIcon className={[icon, playIcon.restart]} />
                  <PlayIcon className={[icon, playIcon.play]} />
                  <PauseIcon className={[icon, playIcon.pause]} />
                </PlayButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={-SEEK_TIME} className={[iconButton, seek.button]}>
                  <SeekIcon className={[icon, iconFlipped]} />
                  <Text className={[seek.label, seek.labelBackward]}>{SEEK_TIME}</Text>
                </SeekButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={SEEK_TIME} className={[iconButton, seek.button]}>
                  <SeekIcon className={icon} />
                  <Text className={[seek.label, seek.labelForward]}>{SEEK_TIME}</Text>
                </SeekButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>
          </Controls.Group>

          <Time.Group className={time.group}>
            <Time.Value type="current" className={time.current} />
            <TimeSlider.Root className={slider.root}>
              <TimeSlider.Track className={slider.track}>
                <TimeSlider.Fill className={[slider.fill.base, slider.fill.fill]} />
                <TimeSlider.Buffer className={[slider.fill.base, slider.fill.buffer]} />
              </TimeSlider.Track>
              <TimeSlider.Thumb className={[slider.thumb.base, slider.thumb.interactive]} />
              <TimeSlider.Preview className={slider.preview}>
                <TimeSlider.Value type="pointer" className={slider.value} />
              </TimeSlider.Preview>
            </TimeSlider.Root>
            <Time.Value type="duration" className={time.duration} />
          </Time.Group>

          <Controls.Group className={buttonGroupEnd}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <CastButton className={[iconButton, castIcon.button]}>
                  <CastEnterIcon className={[icon, castIcon.enter]} />
                  <CastExitIcon className={[icon, castIcon.exit]} />
                </CastButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <AirPlayButton className={[iconButton, airplayIcon.button]}>
                  <AirPlayEnterIcon className={[icon, airplayIcon.enter]} />
                  <AirPlayExitIcon className={[icon, airplayIcon.exit]} />
                </AirPlayButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PiPButton className={[iconButton, pipIcon.button]}>
                  <PipEnterIcon className={[icon, pipIcon.off]} />
                  <PipExitIcon className={[icon, pipIcon.on]} />
                </PiPButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <FullscreenButton className={[iconButton, fullscreenIcon.button]}>
                  <FullscreenEnterIcon className={[icon, fullscreenIcon.enter]} />
                  <FullscreenExitIcon className={[icon, fullscreenIcon.exit]} />
                </FullscreenButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
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

      <VolumeIndicator.Root
        className={[
          inputFeedback.island.root,
          inputFeedback.island.base,
          inputFeedback.island.volume,
          inputFeedback.island.shownVolume,
        ]}
      >
        <VolumeIndicator.Fill className={inputFeedback.island.content}>
          <VolumeHighIcon className={[inputFeedback.island.icon, inputFeedback.island.shownVolumeHigh]} />
          <VolumeLowIcon className={[inputFeedback.island.icon, inputFeedback.island.shownVolumeLow]} />
          <VolumeOffIcon className={[inputFeedback.island.icon, inputFeedback.island.shownVolumeOff]} />
          <VolumeIndicator.Value className={inputFeedback.island.value} />
        </VolumeIndicator.Fill>
      </VolumeIndicator.Root>

      <StatusIndicator.Root
        actions={TOP_STATUS_ACTIONS}
        className={[
          inputFeedback.island.root,
          inputFeedback.island.base,
          inputFeedback.island.statusContent,
          inputFeedback.island.shownStatus,
        ]}
      >
        <CaptionsOnIcon className={[inputFeedback.island.icon, inputFeedback.island.shownCaptionsOn]} />
        <CaptionsOffIcon className={[inputFeedback.island.icon, inputFeedback.island.shownCaptionsOff]} />
        <FullscreenEnterIcon className={[inputFeedback.island.icon, inputFeedback.island.shownFullscreenEnter]} />
        <FullscreenExitIcon className={[inputFeedback.island.icon, inputFeedback.island.shownFullscreenExit]} />
        <PipEnterIcon className={[inputFeedback.island.icon, inputFeedback.island.shownPipEnter]} />
        <PipExitIcon className={[inputFeedback.island.icon, inputFeedback.island.shownPipExit]} />
        <StatusIndicator.Value className={inputFeedback.island.value} />
      </StatusIndicator.Root>

      <SeekIndicator.Root
        className={[inputFeedback.bubble.root, inputFeedback.bubble.seekRoot, inputFeedback.bubble.base]}
      >
        <ChevronIcon className={[inputFeedback.bubble.icon, inputFeedback.bubble.shownSeek]} />
        <SeekIndicator.Value className={inputFeedback.bubble.time} />
      </SeekIndicator.Root>

      <StatusIndicator.Root
        actions={CENTER_STATUS_ACTIONS}
        className={[inputFeedback.bubble.root, inputFeedback.bubble.centerRoot, inputFeedback.bubble.base]}
      >
        <PlayIcon className={[inputFeedback.bubble.icon, inputFeedback.bubble.shownPlay]} />
        <PauseIcon className={[inputFeedback.bubble.icon, inputFeedback.bubble.shownPause]} />
      </StatusIndicator.Root>
    </Container>
  );
}
