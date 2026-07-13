import {
  button,
  buttonGroup,
  container,
  controls,
  error,
  icons,
  popover,
  slider,
  tooltip,
  volumePopover,
} from '@videojs/skins/default/tailwind/audio.tailwind';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { PauseIcon, PlayIcon, RestartIcon, VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@/icons';
import { Container, usePlayer } from '@/player/context';
import { ErrorDialog } from '@/ui/error-dialog';
import { Hotkey } from '@/ui/hotkey';
import { LiveButton } from '@/ui/live-button';
import { MuteButton } from '@/ui/mute-button';
import { PlayButton } from '@/ui/play-button';
import { Popover } from '@/ui/popover';
import { StatusAnnouncer } from '@/ui/status-announcer';
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';
import type { LiveAudioSkinProps } from './skin';

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
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top" boundary="viewport">
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

export function LiveAudioSkinTailwind(props: LiveAudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn(container, className)} {...rest}>
      {children}

      <ErrorDialog.Root>
        <ErrorDialog.Popup className={error.root}>
          <div className={error.dialog}>
            <div className={error.content}>
              <ErrorDialog.Title className={error.title}>Something went wrong.</ErrorDialog.Title>
              <ErrorDialog.Description className={error.description} />
            </div>
            <div className={error.actions}>
              <ErrorDialog.Close className={cn(button.base, button.subtle)}>OK</ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <div className={controls}>
        <Tooltip.Provider>
          <div className={buttonGroup}>
            <Tooltip.Root side="top" boundary="viewport">
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

          <div className={buttonGroup}>
            <VolumePopover />
          </div>
        </Tooltip.Provider>
      </div>

      {/* Hotkeys */}
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />

      {/* Input Feedback */}
      <StatusAnnouncer />
    </Container>
  );
}
