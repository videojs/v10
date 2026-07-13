import {
  buffering,
  button,
  container,
  controls,
  controlsGroup,
  error,
  icons,
  indicator,
  menu,
  overlay,
  popover,
  poster,
  slider,
  statusIndicator,
  tooltip,
  volumeIndicator,
  volumePopover,
} from '@videojs/skins/default/tailwind/video.tailwind';
import { isString } from '@videojs/utils/predicate';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
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
} from '@/icons';
import { Container, usePlayer } from '@/player/context';
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
import { Overlay } from '@/ui/overlay';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { StatusAnnouncer } from '@/ui/status-announcer';
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
      className={cn(slider.fillBase, type === 'fill' ? slider.fill : slider.buffer, className)}
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
      className={cn(slider.thumbBase, persistent ? slider.thumbPersistent : slider.thumb, className)}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className={icons.muteButtonState} render={<Button />}>
      <VolumeOffIcon className={cn(icons.root, icons.volumeOffIcon)} />
      <VolumeLowIcon className={cn(icons.root, icons.volumeLowIcon)} />
      <VolumeHighIcon className={cn(icons.root, icons.volumeHighIcon)} />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className={cn(popover.root, volumePopover.root)}>
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

function CaptionsTrigger(): ReactNode {
  const captions = useCaptionsOptions();
  if (!captions) return null;

  const { disabled } = captions;

  if (!captions.showMenu) {
    return (
      <Tooltip.Root side="top">
        <Tooltip.Trigger
          render={
            <CaptionsButton className={icons.captionsButtonState} render={<Button />}>
              <CaptionsOffIcon className={cn(icons.root, icons.captionsOffIcon)} />
              <CaptionsOnIcon className={cn(icons.root, icons.captionsOnIcon)} />
            </CaptionsButton>
          }
        />
        <Tooltip.Popup className={tooltip.root}>
          <Tooltip.Label />
          <Tooltip.Shortcut className={tooltip.shortcut} />
        </Tooltip.Popup>
      </Tooltip.Root>
    );
  }

  return (
    <Menu.Root side="top" align="center">
      <Menu.Trigger
        disabled={disabled}
        render={
          <CaptionsButton className={icons.captionsButtonState} render={<Button />}>
            <CaptionsOffIcon className={cn(icons.root, icons.captionsOffIcon)} />
            <CaptionsOnIcon className={cn(icons.root, icons.captionsOnIcon)} />
          </CaptionsButton>
        }
      />
      <Menu.Content className={cn(popover.root, menu.root)}>
        <Menu.RadioGroup
          className={menu.group}
          value={captions.value}
          onValueChange={captions.setValue}
          aria-label="Captions"
        >
          {captions.options.map((option) => (
            <Menu.RadioItem key={option.value} className={menu.item} value={option.value} disabled={option.disabled}>
              <span>{option.label}</span>
              <Menu.ItemIndicator checked={option.value === captions.value} forceMount className={menu.indicator}>
                <CheckIcon className={icons.root} />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

export function LiveVideoSkinTailwind(props: LiveVideoSkinProps): ReactNode {
  const { children, className, poster: posterProp, ...rest } = props;

  return (
    <Container className={cn(container, className)} {...rest}>
      {children}

      {posterProp && (
        <Poster
          src={isString(posterProp) ? posterProp : undefined}
          render={isRenderProp(posterProp) ? posterProp : undefined}
          className={poster}
        />
      )}

      <BufferingIndicator className={buffering.root}>
        <SpinnerIcon className={icons.root} />
      </BufferingIndicator>

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
          <div className={controlsGroup.start}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <PlayButton className={icons.playButtonState} render={<Button />}>
                    <RestartIcon className={cn(icons.root, icons.restartIcon)} />
                    <PlayIcon className={cn(icons.root, icons.playIcon)} />
                    <PauseIcon className={cn(icons.root, icons.pauseIcon)} />
                  </PlayButton>
                }
              />
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <LiveButton className={cn(button.base, button.subtle, button.live)} />
          </div>

          <div className="grow" aria-hidden="true" />

          <div className={controlsGroup.end}>
            <VolumePopover />

            <CaptionsTrigger />

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <CastButton className={icons.castButtonState} render={<Button />}>
                    <CastEnterIcon className={cn(icons.root, icons.castEnterIcon)} />
                    <CastExitIcon className={cn(icons.root, icons.castExitIcon)} />
                  </CastButton>
                }
              />
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <AirPlayButton className={icons.airplayButtonState} render={<Button />}>
                    <AirPlayEnterIcon className={cn(icons.root, icons.airplayEnterIcon)} />
                    <AirPlayExitIcon className={cn(icons.root, icons.airplayExitIcon)} />
                  </AirPlayButton>
                }
              />
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <PiPButton className={icons.pipButtonState} render={<Button />}>
                    <PipEnterIcon className={cn(icons.root, icons.pipEnterIcon)} />
                    <PipExitIcon className={cn(icons.root, icons.pipExitIcon)} />
                  </PiPButton>
                }
              />
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <FullscreenButton className={icons.fullscreenButtonState} render={<Button />}>
                    <FullscreenEnterIcon className={cn(icons.root, icons.fullscreenEnterIcon)} />
                    <FullscreenExitIcon className={cn(icons.root, icons.fullscreenExitIcon)} />
                  </FullscreenButton>
                }
              />
              <Tooltip.Popup className={tooltip.root}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={tooltip.shortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      </Controls.Root>

      <Overlay className={overlay} />

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
      <VolumeIndicator.Root className={volumeIndicator.root}>
        <VolumeIndicator.Fill className={indicator.content}>
          <VolumeHighIcon className={cn(volumeIndicator.icon, volumeIndicator.highIcon)} />
          <VolumeLowIcon className={cn(volumeIndicator.icon, volumeIndicator.lowIcon)} />
          <VolumeOffIcon className={cn(volumeIndicator.icon, volumeIndicator.offIcon)} />
          <VolumeIndicator.Value className={indicator.value} />
        </VolumeIndicator.Fill>
      </VolumeIndicator.Root>

      <StatusIndicator.Root actions={TOP_STATUS_ACTIONS} className={statusIndicator.top}>
        <CaptionsOnIcon className={cn(statusIndicator.topIcon, statusIndicator.captionsOnIcon)} />
        <CaptionsOffIcon className={cn(statusIndicator.topIcon, statusIndicator.captionsOffIcon)} />
        <FullscreenEnterIcon className={cn(statusIndicator.topIcon, statusIndicator.fullscreenEnterIcon)} />
        <FullscreenExitIcon className={cn(statusIndicator.topIcon, statusIndicator.fullscreenExitIcon)} />
        <PipEnterIcon className={cn(statusIndicator.topIcon, statusIndicator.pipEnterIcon)} />
        <PipExitIcon className={cn(statusIndicator.topIcon, statusIndicator.pipExitIcon)} />
        <StatusIndicator.Value className={indicator.value} />
      </StatusIndicator.Root>

      <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className={statusIndicator.center}>
        <PlayIcon className={cn(statusIndicator.centerIcon, statusIndicator.playIcon)} />
        <PauseIcon className={cn(statusIndicator.centerIcon, statusIndicator.pauseIcon)} />
      </StatusIndicator.Root>

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
      <VolumeIndicator.Root className={volumeIndicator.root}>
        <VolumeIndicator.Fill className={indicator.content}>
          <VolumeHighIcon className={cn(volumeIndicator.icon, volumeIndicator.highIcon)} />
          <VolumeLowIcon className={cn(volumeIndicator.icon, volumeIndicator.lowIcon)} />
          <VolumeOffIcon className={cn(volumeIndicator.icon, volumeIndicator.offIcon)} />
          <VolumeIndicator.Value className={indicator.value} />
        </VolumeIndicator.Fill>
      </VolumeIndicator.Root>

      <StatusIndicator.Root actions={TOP_STATUS_ACTIONS} className={statusIndicator.top}>
        <CaptionsOnIcon className={cn(statusIndicator.topIcon, statusIndicator.captionsOnIcon)} />
        <CaptionsOffIcon className={cn(statusIndicator.topIcon, statusIndicator.captionsOffIcon)} />
        <FullscreenEnterIcon className={cn(statusIndicator.topIcon, statusIndicator.fullscreenEnterIcon)} />
        <FullscreenExitIcon className={cn(statusIndicator.topIcon, statusIndicator.fullscreenExitIcon)} />
        <PipEnterIcon className={cn(statusIndicator.topIcon, statusIndicator.pipEnterIcon)} />
        <PipExitIcon className={cn(statusIndicator.topIcon, statusIndicator.pipExitIcon)} />
        <StatusIndicator.Value className={indicator.value} />
      </StatusIndicator.Root>

      <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className={statusIndicator.center}>
        <PlayIcon className={cn(statusIndicator.centerIcon, statusIndicator.playIcon)} />
        <PauseIcon className={cn(statusIndicator.centerIcon, statusIndicator.pauseIcon)} />
      </StatusIndicator.Root>
    </Container>
  );
}
