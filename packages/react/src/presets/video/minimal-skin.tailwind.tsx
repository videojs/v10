import { playbackRate } from '@videojs/skins/default/tailwind/video.tailwind';
import {
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  inputFeedback,
  overlay,
  popup,
  poster,
  preview,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
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
  SeekIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons/minimal';
import { Container, usePlayer } from '@/player/context';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { CaptionsButton } from '@/ui/captions-button';
import { CastButton } from '@/ui/cast-button';
import { Controls } from '@/ui/controls';
import { ErrorDialog } from '@/ui/error-dialog';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { Gesture } from '@/ui/gesture/gesture';
import { Hotkey } from '@/ui/hotkey/hotkey';
import { InputFeedback } from '@/ui/input-feedback';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { PlaybackRateButton } from '@/ui/playback-rate-button';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { SeekButton } from '@/ui/seek-button';
import { Slider } from '@/ui/slider';
import { Time } from '@/ui/time';
import { TimeSlider } from '@/ui/time-slider';
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';
import { isRenderProp } from '@/utils/use-render';
import type { MinimalVideoSkinProps } from './minimal-skin';

const SEEK_TIME = 10;

/* --------------------------------------- Components ---------------------------------------- */

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

const SliderBuffer = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderBuffer(props, ref) {
  return <SliderFill type="buffer" ref={ref} {...props} />;
});

const SliderThumb = forwardRef<HTMLDivElement, ComponentProps<'div'> & { persistent?: boolean }>(function SliderThumb(
  { persistent, className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(slider.thumb.base, persistent ? undefined : slider.thumb.interactive, className)}
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
      <Popover.Popup className={cn(popup.volume)}>
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

/* ------------------------------------------ Skin ------------------------------------------- */

export function MinimalVideoSkinTailwind(props: MinimalVideoSkinProps): ReactNode {
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
          <div {...props} className={bufferingIndicator}>
            <SpinnerIcon className={icon} />
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
              <Tooltip.Popup className={cn(popup.tooltip)}></Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <SeekButton seconds={-SEEK_TIME} render={<Button />}>
                    <span className={iconContainer}>
                      <SeekIcon className={cn(icon, iconFlipped)} />
                      <span className={cn(seek.label, seek.labelBackward)}>{SEEK_TIME}</span>
                    </span>
                  </SeekButton>
                }
              />
              <Tooltip.Popup className={cn(popup.tooltip)} />
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <SeekButton seconds={SEEK_TIME} render={<Button />}>
                    <span className={iconContainer}>
                      <SeekIcon className={icon} />
                      <span className={cn(seek.label, seek.labelForward)}>{SEEK_TIME}</span>
                    </span>
                  </SeekButton>
                }
              />
              <Tooltip.Popup className={cn(popup.tooltip)} />
            </Tooltip.Root>
          </div>

          <div className={time.controls}>
            <Time.Group className={time.group}>
              <Time.Value type="current" className={time.current} />
              <Time.Separator className={time.separator} />
              <Time.Value type="duration" className={time.duration} />
            </Time.Group>

            <TimeSlider.Root render={<SliderRoot />}>
              <TimeSlider.Track render={<SliderTrack />}>
                <TimeSlider.Fill render={<SliderFill />} />
                <TimeSlider.Buffer render={<SliderBuffer />} />
              </TimeSlider.Track>
              <TimeSlider.Thumb render={<SliderThumb />} />
              <div className={preview.root}>
                <div className={preview.thumbnailWrapper}>
                  <Slider.Thumbnail className={preview.thumbnail} />
                </div>
                <TimeSlider.Value type="pointer" className={preview.time} />
                <SpinnerIcon className={cn(icon, preview.spinner)} />
              </div>
            </TimeSlider.Root>
          </div>

          <div className={buttonGroupEnd}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger render={<PlaybackRateButton className={playbackRate.button} render={<Button />} />} />
              <Tooltip.Popup className={cn(popup.tooltip)} />
            </Tooltip.Root>

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
              <Tooltip.Popup className={cn(popup.tooltip)}></Tooltip.Popup>
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
              <Tooltip.Popup className={cn(popup.tooltip)}></Tooltip.Popup>
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
              <Tooltip.Popup className={cn(popup.tooltip)}></Tooltip.Popup>
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
              <Tooltip.Popup className={cn(popup.tooltip)}></Tooltip.Popup>
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

      {/* Gestures */}
      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="seekStep" value={-SEEK_TIME} region="left" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />
      <Gesture type="doubletap" action="seekStep" value={SEEK_TIME} region="right" />

      {/* Input Feedback */}
      <InputFeedback.Root className={inputFeedback.root}>
        <InputFeedback.Item
          group="volume"
          className={cn(inputFeedback.island.base, inputFeedback.island.volume, inputFeedback.island.shownVolume)}
        >
          <div data-feedback-island-content="" className={inputFeedback.island.content}>
            <VolumeHighIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeHigh)} />
            <VolumeLowIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeLow)} />
            <VolumeOffIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeOff)} />
            <div aria-hidden="true" className={inputFeedback.island.volumeProgress} />
            <InputFeedback.Value className={inputFeedback.island.value} />
          </div>
        </InputFeedback.Item>

        <InputFeedback.Item
          group="captions"
          className={cn(inputFeedback.island.base, inputFeedback.island.shownCaptions)}
        >
          <div className={inputFeedback.island.content}>
            <CaptionsOnIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOn)} />
            <CaptionsOffIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOff)} />
            <InputFeedback.Value className={inputFeedback.island.value} />
          </div>
        </InputFeedback.Item>

        <InputFeedback.Item group="seek" className={inputFeedback.bubble.base}>
          <InputFeedback.Icon>
            <ChevronIcon className={cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownSeek)} />
          </InputFeedback.Icon>
          <InputFeedback.Time className={inputFeedback.bubble.time} />
        </InputFeedback.Item>

        <InputFeedback.Item group="playback" className={inputFeedback.bubble.base}>
          <InputFeedback.Icon>
            <PlayIcon className={cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPlay)} />
            <PauseIcon className={cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPause)} />
          </InputFeedback.Icon>
        </InputFeedback.Item>
      </InputFeedback.Root>
    </Container>
  );
}
