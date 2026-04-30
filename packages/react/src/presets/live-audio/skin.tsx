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
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';
import type { BaseSkinProps } from '../types';

export type LiveAudioSkinProps = BaseSkinProps;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn('media-button media-button--subtle media-button--icon', className)}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-surface media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

export function TooltipPopup(props: Omit<Tooltip.PopupProps, 'children' | 'className'>): ReactNode {
  return (
    <Tooltip.Popup className="media-surface media-tooltip" {...props}>
      <Tooltip.Label />
      <Tooltip.Shortcut className="media-tooltip__kbd" />
    </Tooltip.Popup>
  );
}

/**
 * Default audio skin configured for live playback. Mirrors {@link AudioSkin}
 * but omits the time slider and the current / duration time displays. A
 * flexible spacer stretches between the play and volume controls so they
 * sit at opposite edges of the control bar.
 */
export function LiveAudioSkin(props: LiveAudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn('media-default-skin media-default-skin--audio', className)} {...rest}>
      {children}

      <ErrorDialog.Root>
        <ErrorDialog.Popup className="media-error">
          <div className="media-error__dialog">
            <div className="media-error__content">
              <ErrorDialog.Title className="media-error__title">Something went wrong.</ErrorDialog.Title>
              <ErrorDialog.Description className="media-error__description" />
            </div>
            <div className="media-error__actions">
              <ErrorDialog.Close className="media-button media-button--subtle">OK</ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <div className="media-surface media-controls">
        <Tooltip.Provider>
          <div className="media-button-group">
            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <PlayButton className="media-button--play" render={<Button />}>
                    <RestartIcon className="media-icon media-icon--restart" />
                    <PlayIcon className="media-icon media-icon--play" />
                    <PauseIcon className="media-icon media-icon--pause" />
                  </PlayButton>
                }
              />
              <TooltipPopup />
            </Tooltip.Root>

            <LiveButton className="media-button media-button--subtle media-button--live" />
          </div>

          <div className="media-time-controls" aria-hidden="true" />

          <div className="media-button-group">
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
    </Container>
  );
}
