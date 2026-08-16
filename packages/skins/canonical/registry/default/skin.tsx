import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/react';
import { AirPlayButton } from '@/components/videojs/airplay-button/airplay-button';
import { CaptionsButton } from '@/components/videojs/captions-button/captions-button';
import { CastButton } from '@/components/videojs/cast-button/cast-button';
import { FullscreenButton } from '@/components/videojs/fullscreen-button/fullscreen-button';
import { PiPButton } from '@/components/videojs/pip-button/pip-button';
import { PlayButton } from '@/components/videojs/play-button/play-button';
import { VolumePopover } from '@/components/videojs/volume-popover/volume-popover';
import { BufferingIndicator } from '@/components/videojs/buffering-indicator/buffering-indicator';
import { ErrorDialog } from '@/components/videojs/error-dialog/error-dialog';
import { VideoInputIndicators } from './internal/components/feedback/video-input-indicators';
import { VideoInputBindings } from '@/components/videojs/video-input-bindings/video-input-bindings';
import { Container } from '@/components/videojs/container/container';
import { Overlay } from '@/components/videojs/overlay/overlay';
import { Poster } from '@/components/videojs/poster/poster';
import { VideoSettingsMenu } from '@/components/videojs/video-settings-menu/video-settings-menu';
import { TimeSlider } from '@/components/videojs/time-slider/time-slider';
import { cn } from '@/components/videojs/utils';
import type { ReactNode } from 'react';
import type { ContainerProps, PosterProps } from '@videojs/react';

export interface DefaultVideoSkinProps extends Omit<ContainerProps, 'children'> {
  children?: ReactNode;
  poster?: string | PosterProps['render'] | undefined;
}

export function DefaultVideoSkin({ children, className, poster, ...containerProps }: DefaultVideoSkinProps = {}) {
  return (
    <Container {...containerProps} className={cn('media-skin media-skin-video media-theme-default', className)}>
      {children}
      {poster && (
        <Poster
          src={typeof poster === 'string' ? poster : undefined}
          render={typeof poster === 'string' ? undefined : poster}
        />
      )}
      <BufferingIndicator />
      <ErrorDialog />

      <Controls.Root
        className={cn(
          'peer/controls group/controls contents text-white',
          '[--media-popover-side-offset:calc(0.5rem+var(--media-controls-padding))]',
          '[--media-tooltip-side-offset:var(--media-popover-side-offset)]',
          '[--media-popover-boundary-offset:0.75rem] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
          '@lg/media-root:absolute @lg/media-root:inset-x-2 @lg/media-root:bottom-2 @lg/media-root:z-10',
          '@lg/media-root:flex @lg/media-root:items-center @lg/media-root:rounded-media-pill',
          '@lg/media-root:bg-media-surface @lg/media-root:shadow-media-surface @lg/media-root:[backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
          '@2xl/media-root:inset-x-3 @2xl/media-root:bottom-3',
          '@lg/media-root:not-data-visible:pointer-events-none @lg/media-root:not-data-visible:opacity-0',
          '@lg/media-root:motion-safe:not-data-visible:scale-95 @lg/media-root:motion-safe:not-data-visible:translate-y-1',
          '@lg/media-root:pointer-fine:motion-safe:not-data-visible:blur-sm',
          '[transition-property:filter,opacity,scale,translate] [transition-duration:var(--media-controls-transition-duration)] [transition-timing-function:ease-out]',
          'peer-data-open/error:hidden!',
        )}
      >
        <Tooltip.Provider>
          <Controls.Group
            className={cn(
              'absolute inset-x-2 bottom-2 z-10 flex origin-bottom items-center rounded-media-pill',
              'bg-media-surface p-media-controls-padding shadow-media-surface [backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
              '@lg/media-root:contents',
              '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
              '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
              '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
              '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:translate-y-1',
              '[transition-property:filter,opacity,scale,translate] [transition-duration:var(--media-controls-transition-duration)] [transition-timing-function:ease-out]',
            )}
          >
            <Controls.Group className="flex items-center gap-px">
              <PlayButton />
              <VolumePopover />
            </Controls.Group>

            <Controls.Group
              className={cn(
                '@container/media-time flex flex-1 items-center gap-2.5 px-3',
                '@max-[16rem]/media-time:[&>*:last-child]:hidden',
              )}
            >
              <TimePrimitive.Value className="tabular-nums" type="current" />
              <TimeSlider />
              <TimePrimitive.Value
                className={cn(
                  'cursor-pointer tabular-nums rounded-sm outline-2 -outline-offset-2 outline-transparent',
                  'focus-visible:outline-current focus-visible:outline-offset-2',
                )}
                type="remaining"
                toggle
              />
            </Controls.Group>

            <Controls.Group className="flex items-center gap-px">
              <CaptionsButton />
              <VideoSettingsMenu />
            </Controls.Group>
          </Controls.Group>

          <Controls.Group
            className={cn(
              'absolute top-2 right-2 z-10 flex origin-top items-center rounded-media-pill',
              'bg-media-surface p-media-controls-padding shadow-media-surface [backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
              '@lg/media-root:contents',
              '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
              '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
              '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
              '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:-translate-y-1',
              '[transition-property:filter,opacity,scale,translate] [transition-duration:var(--media-controls-transition-duration)] [transition-timing-function:ease-out]',
            )}
          >
            <Controls.Group className="flex items-center gap-px">
              <CastButton />
              <AirPlayButton />
              <PiPButton />
              <FullscreenButton />
            </Controls.Group>
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Root>

      <Overlay />
      <VideoInputBindings />
      <VideoInputIndicators />
    </Container>
  );
}
