/** @jsxImportSource @videojs/core */

import {
  AirPlayButton,
  CastButton,
  Container,
  Controls,
  FullscreenButton,
  Gesture,
  Hotkey,
  PiPButton,
  PlayButton,
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
} from '@videojs/icons/components';
import { cn } from '@videojs/utils/style';
import {
  airplayIcon,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  castIcon,
  container,
  controls,
  fullscreenIcon,
  icon,
  iconContainer,
  iconFlipped,
  pipIcon,
  playIcon,
  popup,
  slider,
  time,
} from './tailwind/video.tailwind';

const SEEK_TIME = 10;

export interface DefaultVideoSkinProps {
  className?: string | undefined;
  children?: unknown;
}

export function DefaultVideoSkin({ className, children }: DefaultVideoSkinProps) {
  return (
    <Container className={cn(container, className)}>
      {children}

      <Controls.Root className={controls}>
        <Tooltip.Provider>
          <Controls.Group className={buttonGroupStart}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PlayButton className={cn(button.base, button.subtle, button.icon, playIcon.button)}>
                  <RestartIcon className={cn(icon, playIcon.restart)} />
                  <PlayIcon className={cn(icon, playIcon.play)} />
                  <PauseIcon className={cn(icon, playIcon.pause)} />
                </PlayButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={-SEEK_TIME} className={cn(button.base, button.subtle, button.icon)}>
                  <SeekIcon className={cn(icon, iconContainer, iconFlipped)} />
                </SeekButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <SeekButton seconds={SEEK_TIME} className={cn(button.base, button.subtle, button.icon)}>
                  <SeekIcon className={cn(icon, iconContainer)} />
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
                <TimeSlider.Fill className={cn(slider.fill.base, slider.fill.fill)} />
                <TimeSlider.Buffer className={cn(slider.fill.base, slider.fill.buffer)} />
              </TimeSlider.Track>
              <TimeSlider.Thumb className={cn(slider.thumb.base, slider.thumb.interactive)} />
              <TimeSlider.Preview className={slider.preview}>
                <TimeSlider.Value type="pointer" className={slider.value} />
              </TimeSlider.Preview>
            </TimeSlider.Root>
            <Time.Value type="duration" className={time.duration} />
          </Time.Group>

          <Controls.Group className={buttonGroupEnd}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <CastButton className={cn(button.base, button.subtle, button.icon, castIcon.button)}>
                  <CastEnterIcon className={cn(icon, castIcon.enter)} />
                  <CastExitIcon className={cn(icon, castIcon.exit)} />
                </CastButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <AirPlayButton className={cn(button.base, button.subtle, button.icon, airplayIcon.button)}>
                  <AirPlayEnterIcon className={cn(icon, airplayIcon.enter)} />
                  <AirPlayExitIcon className={cn(icon, airplayIcon.exit)} />
                </AirPlayButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PiPButton className={cn(button.base, button.subtle, button.icon, pipIcon.button)}>
                  <PipEnterIcon className={cn(icon, pipIcon.off)} />
                  <PipExitIcon className={cn(icon, pipIcon.on)} />
                </PiPButton>
              </Tooltip.Trigger>
              <Tooltip.Popup className={popup.tooltip}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <FullscreenButton className={cn(button.base, button.subtle, button.icon, fullscreenIcon.button)}>
                  <FullscreenEnterIcon className={cn(icon, fullscreenIcon.enter)} />
                  <FullscreenExitIcon className={cn(icon, fullscreenIcon.exit)} />
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
