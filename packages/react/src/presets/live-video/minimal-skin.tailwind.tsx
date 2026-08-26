'use client';

import { captionsText } from '@videojs/core/i18n/text/menu';
import {
  controlsBackdrop,
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  container,
  controls,
  dialog,
  icon,
  iconState,
  inputIndicator,
  menu,
  popup,
  poster,
  slider,
  spacer,
  statusIndicator,
  volumeIndicator,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';

import { useTranslator } from '@/i18n/context';
import {
  AirPlayEnterIcon,
  AirPlayExitIcon,
  CaptionsOffIcon,
  CaptionsOnIcon,
  CastEnterIcon,
  CastExitIcon,
  CheckIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
  RestartIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons/minimal';
import { Container } from '@/player/container';
import { usePlayer } from '@/player/context';
import { AirPlayButton } from '@/ui/airplay-button';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { CaptionsButton } from '@/ui/captions-button';
import { useCaptionsOptions } from '@/ui/captions-radio-group';
import { CastButton } from '@/ui/cast-button';
import { Controls } from '@/ui/controls';
import { ErrorDialog } from '@/ui/error-dialog';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { Gesture } from '@/ui/gesture';
import { Hotkey } from '@/ui/hotkey';
import { LiveButton } from '@/ui/live-button';
import { Menu } from '@/ui/menu';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { StatusAnnouncer } from '@/ui/status-announcer';
import { StatusIndicator } from '@/ui/status-indicator';
import { Tooltip } from '@/ui/tooltip';
import { VolumeIndicator } from '@/ui/volume-indicator';
import { VolumeSlider } from '@/ui/volume-slider';

import type { MinimalLiveVideoSkinProps } from './minimal-skin';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;
const CENTER_STATUS_ACTIONS = ['togglePaused'] as const;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button ref={ref} type="button" className={cn(button.base, button.subtle, button.icon, className)} {...props} />
  );
});

const SliderRoot = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderRoot({ className, ...props }, ref) {
  return <div ref={ref} className={cn(slider.root, className)} {...props} />;
});

const SliderTrack = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderTrack(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn(slider.track, className)} {...props} />;
});

const SliderFill = forwardRef<HTMLDivElement, ComponentProps<'div'> & { type?: 'fill' | 'buffer' }>(function SliderFill(
  { type = 'fill', className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(slider.fill.base, type === 'fill' ? slider.fill.fill : slider.fill.buffer, className)}
      {...props}
    />
  );
});

const SliderThumb = forwardRef<HTMLDivElement, ComponentProps<'div'> & { persistent?: boolean }>(function SliderThumb(
  { persistent, className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(slider.thumb.base, persistent ? slider.thumb.persistent : slider.thumb.interactive, className)}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnavailable = usePlayer((s) => s.volumeAvailability !== 'available');

  const muteButton = (
    <MuteButton className={iconState.mute.button} render={<Button />}>
      <VolumeOffIcon className={cn(icon, iconState.mute.volumeOff)} />
      <VolumeLowIcon className={cn(icon, iconState.mute.volumeLow)} />
      <VolumeHighIcon className={cn(icon, iconState.mute.volumeHigh)} />
    </MuteButton>
  );

  if (volumeUnavailable) {
    return (
      <Tooltip.Root side="top" delay={0} sticky>
        <Tooltip.Trigger render={muteButton} />
        <Tooltip.Popup className={cn(popup.tooltip)}>
          <Tooltip.Label />
          <Tooltip.Shortcut className={popup.tooltipShortcut} />
        </Tooltip.Popup>
      </Tooltip.Root>
    );
  }

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="right">
      <Tooltip.Root side="top" delay={0} sticky>
        <Tooltip.Trigger render={<Popover.Trigger render={muteButton} />} />
        <Tooltip.Popup className={cn(popup.tooltip)}>
          <Tooltip.Label />
          <Tooltip.Shortcut className={popup.tooltipShortcut} />
        </Tooltip.Popup>
      </Tooltip.Root>
      <Popover.Popup className={cn(popup.volume)}>
        <VolumeSlider.Root orientation="horizontal" thumbAlignment="edge" render={<SliderRoot />}>
          <VolumeSlider.Track render={<SliderTrack />}>
            <VolumeSlider.Fill render={<SliderFill />} />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb render={(props) => <SliderThumb persistent {...props} />} />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

function CaptionsTrigger(): ReactNode {
  const t = useTranslator();
  const captions = useCaptionsOptions();
  if (!captions) return null;

  const { disabled } = captions;

  if (!captions.showMenu) {
    return (
      <Tooltip.Root side="top">
        <Tooltip.Trigger
          render={
            <CaptionsButton className={iconState.captions.button} render={<Button />}>
              <CaptionsOffIcon className={cn(icon, iconState.captions.off)} />
              <CaptionsOnIcon className={cn(icon, iconState.captions.on)} />
            </CaptionsButton>
          }
        />
        <Tooltip.Popup className={cn(popup.tooltip)}>
          <Tooltip.Label />
          <Tooltip.Shortcut className={popup.tooltipShortcut} />
        </Tooltip.Popup>
      </Tooltip.Root>
    );
  }

  return (
    <Menu.Root side="top" align="center">
      <Menu.Trigger
        disabled={disabled}
        render={
          <CaptionsButton className={iconState.captions.button} render={<Button />}>
            <CaptionsOffIcon className={cn(icon, iconState.captions.off)} />
            <CaptionsOnIcon className={cn(icon, iconState.captions.on)} />
          </CaptionsButton>
        }
      />
      <Menu.Popup className={cn(popup.popover, menu.root)}>
        <Menu.Content className={menu.content}>
          <Menu.RadioGroup
            className={menu.group}
            value={captions.value}
            onValueChange={captions.setValue}
            aria-label={t(captionsText)}
          >
            {captions.options.map((option) => (
              <Menu.RadioItem key={option.value} className={menu.item} value={option.value} disabled={option.disabled}>
                <bdi dir="auto">{option.label}</bdi>
                <Menu.ItemIndicator checked={option.value === captions.value} forceMount className={menu.indicator}>
                  <CheckIcon className={cn(icon, menu.icon)} />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

export function MinimalLiveVideoSkinTailwind(props: MinimalLiveVideoSkinProps): ReactNode {
  const { children, className, renderPoster, style, ...rest } = props;

  return (
    <Container className={cn(container(false), className)} style={style} {...rest}>
      {children}

      <Poster className={poster(false)} render={renderPoster} />

      <BufferingIndicator
        render={(props) => (
          <div {...props} className={bufferingIndicator}>
            <SpinnerIcon className={icon} />
          </div>
        )}
      />

      <ErrorDialog.Root>
        <ErrorDialog.Backdrop className={dialog.backdrop} />
        <ErrorDialog.Popup className={dialog.popup}>
          <div className={dialog.content}>
            <ErrorDialog.Title className={dialog.title}></ErrorDialog.Title>
            <ErrorDialog.Description className={dialog.description} />
          </div>
          <div className={dialog.actions}>
            <ErrorDialog.Close className={cn(button.base, button.primary)}></ErrorDialog.Close>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root>
        <Controls.Backdrop className={controlsBackdrop} />
        <Controls.Content className={controls}>
          <Tooltip.Provider>
            <div className={buttonGroupStart}>
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PlayButton className={iconState.play.button} render={<Button />}>
                      <RestartIcon className={cn(icon, iconState.play.restart)} />
                      <PlayIcon className={cn(icon, iconState.play.play)} />
                      <PauseIcon className={cn(icon, iconState.play.pause)} />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className={cn(popup.tooltip)}>
                  <Tooltip.Label />
                  <Tooltip.Shortcut className={popup.tooltipShortcut} />
                </Tooltip.Popup>
              </Tooltip.Root>

              <LiveButton className={cn(button.base, button.subtle, button.live)} />

              <VolumePopover />
            </div>

            <div className={spacer} aria-hidden="true" />

            <div className={buttonGroupEnd}>
              <CaptionsTrigger />

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <CastButton className={iconState.cast.button} render={<Button />}>
                      <CastEnterIcon className={cn(icon, iconState.cast.enter)} />
                      <CastExitIcon className={cn(icon, iconState.cast.exit)} />
                    </CastButton>
                  }
                />
                <Tooltip.Popup className={cn(popup.tooltip)}>
                  <Tooltip.Label />
                  <Tooltip.Shortcut className={popup.tooltipShortcut} />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <AirPlayButton className={iconState.airplay.button} render={<Button />}>
                      <AirPlayEnterIcon className={cn(icon, iconState.airplay.enter)} />
                      <AirPlayExitIcon className={cn(icon, iconState.airplay.exit)} />
                    </AirPlayButton>
                  }
                />
                <Tooltip.Popup className={cn(popup.tooltip)}>
                  <Tooltip.Label />
                  <Tooltip.Shortcut className={popup.tooltipShortcut} />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PiPButton className={iconState.pip.button} render={<Button />}>
                      <PipEnterIcon className={cn(icon, iconState.pip.off)} />
                      <PipExitIcon className={cn(icon, iconState.pip.on)} />
                    </PiPButton>
                  }
                />
                <Tooltip.Popup className={cn(popup.tooltip)}>
                  <Tooltip.Label />
                  <Tooltip.Shortcut className={popup.tooltipShortcut} />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <FullscreenButton className={iconState.fullscreen.button} render={<Button />}>
                      <FullscreenEnterIcon className={cn(icon, iconState.fullscreen.enter)} />
                      <FullscreenExitIcon className={cn(icon, iconState.fullscreen.exit)} />
                    </FullscreenButton>
                  }
                />
                <Tooltip.Popup className={cn(popup.tooltip)}>
                  <Tooltip.Label />
                  <Tooltip.Shortcut className={popup.tooltipShortcut} />
                </Tooltip.Popup>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </Controls.Content>
      </Controls.Root>

      {/* Hotkeys */}
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="c" action="toggleSubtitles" />
      <Hotkey keys="i" action="togglePictureInPicture" />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />

      {/* Gestures */}
      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />

      {/* Input Indicators */}
      <StatusAnnouncer className="sr-only" />
      <div className={inputIndicator}>
        <VolumeIndicator.Root className={volumeIndicator.root}>
          <VolumeIndicator.Fill className={volumeIndicator.content}>
            <VolumeHighIcon className={cn(volumeIndicator.icon.base, volumeIndicator.icon.high)} />
            <VolumeLowIcon className={cn(volumeIndicator.icon.base, volumeIndicator.icon.low)} />
            <VolumeOffIcon className={cn(volumeIndicator.icon.base, volumeIndicator.icon.off)} />
            <div aria-hidden="true" className={volumeIndicator.progress} />
            <VolumeIndicator.Value className={volumeIndicator.value} />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>

        <StatusIndicator.Root actions={TOP_STATUS_ACTIONS} className={statusIndicator.root}>
          <div className={statusIndicator.content}>
            <CaptionsOnIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.captionsOn)} />
            <CaptionsOffIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.captionsOff)} />
            <FullscreenEnterIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.fullscreenEnter)} />
            <FullscreenExitIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.fullscreenExit)} />
            <PipEnterIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.pipEnter)} />
            <PipExitIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.pipExit)} />
            <StatusIndicator.Value className={statusIndicator.value} />
          </div>
        </StatusIndicator.Root>

        <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className={statusIndicator.playback.root}>
          <PlayIcon className={cn(statusIndicator.playback.icon.base, statusIndicator.playback.icon.play)} />
          <PauseIcon className={cn(statusIndicator.playback.icon.base, statusIndicator.playback.icon.pause)} />
        </StatusIndicator.Root>
      </div>
    </Container>
  );
}
