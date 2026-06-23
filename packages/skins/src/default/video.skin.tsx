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
  StatusAnnouncer,
  Time,
  TimeSlider,
  Tooltip,
} from '@videojs/core/components';
import {
  AirPlayEnterIcon,
  AirPlayExitIcon,
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
  iconContainer,
  iconFlipped,
  overlay,
  pipIcon,
  playIcon,
  popup,
  slider,
  time,
} from './tailwind/video.tailwind';

const SEEK_TIME = 10;
const iconButton = [button.base, button.subtle, button.icon];

export interface DefaultVideoSkinProps {
  className?: string;
  children?: unknown;
}

export function DefaultVideoSkin({ className, children }: DefaultVideoSkinProps) {
  return (
    <Container className={[container, className]}>
      {children}

      <Poster />

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
                <SeekButton seconds={-SEEK_TIME} className={[iconButton]}>
                  <SeekIcon className={[icon, iconContainer, iconFlipped]} />
                </SeekButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={SEEK_TIME} className={[iconButton]}>
                  <SeekIcon className={[icon, iconContainer]} />
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
    </Container>
  );
}
