import {
  button,
  buttonGroup,
  controls,
  error,
  icon,
  iconState,
  popup,
  root,
  slider,
} from '@videojs/skins/minimal/tailwind/audio.tailwind';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { PauseIcon, PlayIcon, RestartIcon, VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@/icons/minimal';
import { Container, usePlayer } from '@/player/context';
import { ErrorDialog } from '@/ui/error-dialog';
import { MuteButton } from '@/ui/mute-button';
import { PlayButton } from '@/ui/play-button';
import { Popover } from '@/ui/popover';
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';
import type { MinimalLiveAudioSkinProps } from './minimal-skin';

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
    <Popover.Root openOnHover delay={200} closeDelay={100} side="left">
      <Popover.Trigger render={muteButton} />
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

export function MinimalLiveAudioSkinTailwind(props: MinimalLiveAudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn(root, className)} {...rest}>
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
          </div>

          <div className="grow" aria-hidden="true" />

          <div className={buttonGroup}>
            <VolumePopover />
          </div>
        </Tooltip.Provider>
      </div>
    </Container>
  );
}
