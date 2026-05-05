import {
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  controls,
  error,
  icon,
  iconState,
  inputFeedback,
  overlay,
  popup,
  poster,
  root,
  slider,
} from '@videojs/skins/default/tailwind/video.tailwind';
import { isString } from '@videojs/utils/predicate';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
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
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons';
import { Container, usePlayer } from '@/player/context';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { CaptionsButton } from '@/ui/captions-button';
import { CastButton } from '@/ui/cast-button';
import { Controls } from '@/ui/controls';
import { ErrorDialog } from '@/ui/error-dialog';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { Gesture } from '@/ui/gesture';
import { Hotkey } from '@/ui/hotkey';
import { LiveButton } from '@/ui/live-button';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { StatusAnnouncer } from '@/ui/status-announcer/status-announcer';
import { StatusIndicator } from '@/ui/status-indicator';
import { Tooltip } from '@/ui/tooltip';
import { VolumeIndicator } from '@/ui/volume-indicator';
import { VolumeSlider } from '@/ui/volume-slider';
import { isRenderProp } from '@/utils/use-render';
import type { LiveVideoSkinProps } from './skin';

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
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className={iconState.mute.button} render={<Button />}>
      <VolumeOffIcon className={cn(icon, iconState.mute.volumeOff)} />
      <VolumeLowIcon className={cn(icon, iconState.mute.volumeLow)} />
      <VolumeHighIcon className={cn(icon, iconState.mute.volumeHigh)} />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className={cn(popup.popover, popup.volume)}>
        <VolumeSlider.Root orientation="vertical" thumbAlignment="edge" render={<SliderRoot />}>
          <VolumeSlider.Track render={<SliderTrack />}>
            <VolumeSlider.Fill render={<SliderFill />} />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb render={(props) => <SliderThumb persistent {...props} />} />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

function TooltipPopup(props: Omit<Tooltip.PopupProps, 'children' | 'className'>): ReactNode {
  return (
    <Tooltip.Popup className={cn(popup.tooltip)} {...props}>
      <Tooltip.Label />
      <Tooltip.Shortcut className={popup.tooltipShortcut} />
    </Tooltip.Popup>
  );
}

export function LiveVideoSkinTailwind(props: LiveVideoSkinProps): ReactNode {
  const { children, className, poster: posterProp, ...rest } = props;

  return (
    <Container className={cn(root(false), className)} {...rest}>
      {children}

      {posterProp && (
        <Poster
          src={isString(posterProp) ? posterProp : undefined}
          render={isRenderProp(posterProp) ? posterProp : undefined}
          className={poster(false)}
        />
      )}

      <BufferingIndicator
        render={(props) => (
          <div {...props} className={bufferingIndicator.root}>
            <div className={bufferingIndicator.container}>
              <SpinnerIcon className={icon} />
            </div>
          </div>
        )}
      />

      <ErrorDialog.Root>
        <ErrorDialog.Popup className={error.root}>
          <div className={error.dialog}>
            <div className={error.content}>
              <ErrorDialog.Title className={error.title}>Something went wrong.</ErrorDialog.Title>
              <ErrorDialog.Description className={error.description} />
            </div>
            <div className={error.actions}>
              <ErrorDialog.Close className={cn(button.base, button.primary)}>OK</ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root
        data-controls="" // Used as a hook for Tailwind has-[] styles
        className={controls}
      >
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
              <TooltipPopup />
            </Tooltip.Root>

            <LiveButton className={cn(button.base, button.subtle, button.live)} />
          </div>

          <div className="grow" aria-hidden="true" />

          <div className={buttonGroupEnd}>
            <VolumePopover />

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <CaptionsButton className={iconState.captions.button} render={<Button />}>
                    <CaptionsOffIcon className={cn(icon, iconState.captions.off)} />
                    <CaptionsOnIcon className={cn(icon, iconState.captions.on)} />
                  </CaptionsButton>
                }
              />
              <TooltipPopup />
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <CastButton className={iconState.cast.button} render={<Button />}>
                    <CastEnterIcon className={cn(icon, iconState.cast.enter)} />
                    <CastExitIcon className={cn(icon, iconState.cast.exit)} />
                  </CastButton>
                }
              />
              <TooltipPopup />
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
              <TooltipPopup />
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
              <TooltipPopup />
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      </Controls.Root>

      <div className={overlay} />

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

      {/* Input Feedback */}
      <StatusAnnouncer />
      <div className={inputFeedback.root}>
        <VolumeIndicator.Root
          className={cn(inputFeedback.island.base, inputFeedback.island.volume, inputFeedback.island.shownVolume)}
        >
          <VolumeIndicator.Fill className={inputFeedback.island.content}>
            <VolumeHighIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeHigh)} />
            <VolumeLowIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeLow)} />
            <VolumeOffIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeOff)} />
            <VolumeIndicator.Value className={inputFeedback.island.value} />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>

        <StatusIndicator.Root
          actions={TOP_STATUS_ACTIONS}
          className={cn(inputFeedback.island.base, inputFeedback.island.shownStatus)}
        >
          <div className={inputFeedback.island.content}>
            <CaptionsOnIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOn)} />
            <CaptionsOffIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOff)} />
            <FullscreenEnterIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownFullscreenEnter)} />
            <FullscreenExitIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownFullscreenExit)} />
            <PipEnterIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownPipEnter)} />
            <PipExitIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownPipExit)} />
            <StatusIndicator.Value className={inputFeedback.island.value} />
          </div>
        </StatusIndicator.Root>

        <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className={inputFeedback.bubble.base}>
          <PlayIcon className={cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPlay)} />
          <PauseIcon className={cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPause)} />
        </StatusIndicator.Root>
      </div>
    </Container>
  );
}
