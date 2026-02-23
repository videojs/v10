import type { FullscreenButtonState, MuteButtonState, PlayButtonState } from '@videojs/core';
import {
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/react/minimal';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { Container } from '@/player/context';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { Controls } from '@/ui/controls';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { SeekButton } from '@/ui/seek-button';
import { Time } from '@/ui/time';
import type { MinimalVideoSkinProps } from './minimal-skin';

const SEEK_TIME = 10;

/* ------------------------------------ Reused fragments ------------------------------------- */

const icon = cn(
  '[grid-area:1/1] size-4.5',
  'drop-shadow-[0_1px_0_var(--tw-shadow-color)] shadow-black/25',
  'transition-discrete transition-[display,opacity] duration-150 ease-out'
);

const iconHidden = 'hidden opacity-0';

/* --------------------------------------- Components ---------------------------------------- */

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        // Layout
        'grid shrink-0 p-2.5 cursor-pointer bg-transparent border-none rounded-md',
        'text-white select-none',
        'outline-2 outline-transparent -outline-offset-2',
        // Transitions
        'transition-[background-color,color,outline-offset] duration-150 ease-out',
        // Hover / focus / expanded
        'hover:text-white/80 hover:no-underline',
        'focus-visible:text-white/80',
        'focus-visible:outline-white focus-visible:outline-offset-2',
        'aria-expanded:text-white/80',
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale',
        className
      )}
      {...props}
    />
  );
});

function PlayButtonIcon({ state, className, ...rest }: { state: PlayButtonState } & ComponentProps<'svg'>) {
  const { ended, paused } = state;
  return (
    <>
      <RestartIcon {...rest} className={cn(className, { [iconHidden]: !ended })} />
      <PlayIcon {...rest} className={cn(className, { [iconHidden]: ended || !paused })} />
      <PauseIcon {...rest} className={cn(className, { [iconHidden]: paused })} />
    </>
  );
}

function MuteButtonIcon({ state, className, ...rest }: { state: MuteButtonState } & ComponentProps<'svg'>) {
  const { muted, volumeLevel } = state;
  return (
    <>
      <VolumeOffIcon {...rest} className={cn(className, { [iconHidden]: !muted })} />
      <VolumeLowIcon {...rest} className={cn(className, { [iconHidden]: muted || volumeLevel !== 'low' })} />
      <VolumeHighIcon {...rest} className={cn(className, { [iconHidden]: muted || volumeLevel === 'low' })} />
    </>
  );
}

function FullscreenButtonIcon({ state, className, ...rest }: { state: FullscreenButtonState } & ComponentProps<'svg'>) {
  const { fullscreen } = state;
  return (
    <>
      <FullscreenExitIcon {...rest} className={cn(className, { [iconHidden]: !fullscreen })} />
      <FullscreenEnterIcon {...rest} className={cn(className, { [iconHidden]: fullscreen })} />
    </>
  );
}

/* ------------------------------------------ Skin ------------------------------------------- */

export function MinimalVideoSkinTailwind(props: MinimalVideoSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container
      className={cn(
        // Layout & containment
        'relative isolate overflow-clip @container/media-root',
        // Appearance
        'rounded-[var(--media-border-radius,0.75rem)] bg-black',
        'font-sans text-[0.8125rem] leading-normal subpixel-antialiased',
        // Box-sizing reset for children
        '**:box-border',
        // Outer border ring (::after only)
        'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
        'after:inset-0 after:ring-1 after:ring-inset after:ring-black/15',
        'dark:after:ring-white/15',
        // Video element
        '[&>video]:block [&>video]:w-full [&>video]:h-full',
        // Poster image
        '[&>img]:absolute [&>img]:inset-0 [&>img]:w-full [&>img]:h-full',
        '[&>img]:object-cover [&>img]:pointer-events-none',
        '[&>img]:transition-opacity [&>img]:duration-[250ms]',
        '[&>img:not([data-visible])]:opacity-0',
        // Fullscreen
        '[&:fullscreen]:rounded-none',
        className
      )}
      {...rest}
    >
      {children}

      <BufferingIndicator
        render={(props, state) =>
          state.visible ? (
            <div
              {...props}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 text-white"
            >
              <SpinnerIcon className={icon} />
            </div>
          ) : null
        }
      />

      <Controls.Root
        className={cn(
          // Peer marker for overlay/captions
          'peer/controls',
          // Layout
          'absolute @container/media-controls bottom-0 inset-x-0',
          'pt-8 px-1.5 pb-1.5 flex items-center gap-2',
          'text-white z-10',
          // Transitions
          'will-change-[translate,filter,opacity]',
          'transition-[translate,filter,opacity] ease-out',
          'delay-0 duration-75',
          // Hidden state
          'not-data-[visible]:opacity-0 not-data-[visible]:translate-y-full',
          'not-data-[visible]:blur-[8px] not-data-[visible]:pointer-events-none',
          'not-data-[visible]:delay-500 not-data-[visible]:duration-500',
          // Reduced motion + hidden
          'motion-reduce:not-data-[visible]:duration-100',
          'motion-reduce:not-data-[visible]:translate-y-0',
          'motion-reduce:not-data-[visible]:blur-none motion-reduce:not-data-[visible]:scale-100',
          // Wider container
          '@sm/media-root:pt-10 @sm/media-root:px-3 @sm/media-root:pb-3',
          '@sm/media-root:gap-3.5'
        )}
      >
        <span className={cn('flex items-center gap-[0.075rem]', '@2xl/media-root:gap-0.5')}>
          <PlayButton
            render={(props, state) => (
              <Button {...props}>
                <PlayButtonIcon state={state} className={icon} />
              </Button>
            )}
          />

          <SeekButton
            seconds={-SEEK_TIME}
            render={(props) => (
              <Button {...props} className="@max-md/media-controls:hidden">
                <span className="relative">
                  <SeekIcon className={cn(icon, '[scale:-1_1]')} />
                  <span className="absolute left-0 -bottom-0.75 text-[0.75em] font-[480]">{SEEK_TIME}</span>
                </span>
              </Button>
            )}
          />

          <SeekButton
            seconds={SEEK_TIME}
            render={(props) => (
              <Button {...props} className="@max-md/media-controls:hidden">
                <span className="relative">
                  <SeekIcon className={icon} />
                  <span className="absolute right-0 -bottom-0.75 text-[0.75em] font-[480]">{SEEK_TIME}</span>
                </span>
              </Button>
            )}
          />
        </span>

        <span className={cn('flex flex-row-reverse items-center flex-1 gap-3', '@md/media-controls:flex-row')}>
          <Time.Group className="flex items-center gap-1">
            <Time.Value
              type="current"
              className={cn(
                'hidden tabular-nums drop-shadow-[0_1px_0_var(--tw-shadow-color)] shadow-black/25',
                '@md/media-controls:inline'
              )}
            />
            <Time.Separator className={cn('hidden', '@md/media-controls:inline @md/media-controls:text-white/50')} />
            <Time.Value
              type="duration"
              className={cn(
                'tabular-nums drop-shadow-[0_1px_0_var(--tw-shadow-color)] shadow-black/25',
                '@md/media-controls:text-white/50'
              )}
            />
          </Time.Group>

          {/* Temporary spacer */}
          <span className="flex-1 h-[3px] rounded-full bg-white/20" />
        </span>

        <span className={cn('flex items-center gap-[0.075rem]', '@2xl/media-root:gap-0.5')}>
          <MuteButton
            render={(props, state) => (
              <Button {...props}>
                <MuteButtonIcon state={state} className={icon} />
              </Button>
            )}
          />

          <PiPButton
            render={(props) => (
              <Button {...props}>
                <PipIcon className={icon} />
              </Button>
            )}
          />

          <FullscreenButton
            render={(props, state) => (
              <Button {...props}>
                <FullscreenButtonIcon state={state} className={icon} />
              </Button>
            )}
          />
        </span>
      </Controls.Root>

      {/* <div
        className={cn(
          'absolute z-20 pointer-events-none text-balance text-base',
          'inset-x-4 bottom-6',
          'transition-transform duration-150 ease-out delay-600',
          'motion-reduce:duration-50',
          // Responsive font sizes
          '@xs/media-root:text-2xl',
          '@3xl/media-root:text-3xl',
          '@7xl/media-root:text-4xl',
          // Shift up when controls visible
          'peer-data-[visible]/controls:-translate-y-10 peer-data-[visible]/controls:delay-25',
        )}
      >
        <div className="max-w-[42ch] mx-auto text-center flex flex-col items-center">
          <span className={cn(
            'block py-0.5 px-2 text-white text-center whitespace-pre-wrap leading-1.2',
            '[text-shadow:0_0_1px_oklab(0_0_0_/_0.7),0_0_8px_oklab(0_0_0_/_0.7)]',
            'contrast-more:[text-shadow:none] contrast-more:[box-decoration-break:clone] contrast-more:bg-black/70',
            '*:inline',
          )}>
            An example cue
          </span>
        </div>
      </div> */}

      <div
        className={cn(
          // Layout
          'absolute inset-0 flex flex-col items-start',
          'pointer-events-none rounded-[inherit]',
          // Gradient overlay (heavier gradient with positioned stop)
          'bg-gradient-to-t from-black/70 via-black/50 via-[7.5rem] to-transparent',
          // Transitions
          'transition-opacity ease-out duration-75 delay-0',
          // Hidden when controls hidden (peer sibling)
          'peer-not-data-[visible]/controls:opacity-0',
          'peer-not-data-[visible]/controls:delay-500',
          'peer-not-data-[visible]/controls:duration-500',
          // Reduced motion
          'motion-reduce:peer-not-data-[visible]/controls:duration-100'
        )}
      />
    </Container>
  );
}
