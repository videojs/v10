import type { FullscreenButtonState, MuteButtonState, PlayButtonState } from '@videojs/core';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
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
} from '@videojs/icons/react';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { Container } from '@/player/context';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { CaptionsButton, type CaptionsButtonState } from '@/ui/captions-button';
import { Controls } from '@/ui/controls';
import { ErrorDialog } from '@/ui/error-dialog';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { SeekButton } from '@/ui/seek-button';
import { Time } from '@/ui/time';
import type { VideoSkinProps } from './skin';

const SEEK_TIME = 10;

/* ------------------------------------ Reused fragments ------------------------------------- */

const surface = cn(
  'bg-white/10',
  'backdrop-blur-3xl backdrop-brightness-90 backdrop-saturate-150',
  // Border and shadow
  'ring ring-white/5 ring-inset shadow-sm shadow-black/15',
  // Border to enhance contrast on lighter videos
  'after:absolute after:inset-0 after:ring after:rounded-[inherit] after:ring-black/15 after:pointer-events-none after:z-10',
  // Reduced transparency for users with preference
  '[@media(prefers-reduced-transparency:reduce)]:bg-black/70 [@media(prefers-reduced-transparency:reduce)]:ring-black [@media(prefers-reduced-transparency:reduce)]:after:ring-white/20',
  // High contrast mode
  'contrast-more:bg-black/90 contrast-more:ring-black contrast-more:after:ring-white/20'
);

const icon = cn(
  '[grid-area:1/1] size-4.5 shrink-0',
  'drop-shadow-[0_1px_0_var(--tw-drop-shadow-color)] drop-shadow-black/25',
  'transition-discrete transition-[display,opacity] duration-150 ease-out'
);

const iconHidden = 'hidden opacity-0';

/* --------------------------------------- Components ---------------------------------------- */

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'> & { variant?: 'icon' }>(function Button(
  { className, variant, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        // Shared
        'shrink-0 border-none cursor-pointer select-none',
        'outline-2 outline-transparent -outline-offset-2',
        'transition-[background-color,color,outline-offset] duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale',
        // Variant
        variant === 'icon'
          ? cn(
              'grid p-2 bg-transparent rounded-full',
              'text-white/90',
              'text-shadow-2xs text-shadow-black/25',
              'hover:bg-white/10 hover:text-white hover:no-underline',
              'focus-visible:bg-white/10 focus-visible:text-white',
              'focus-visible:outline-blue-500 focus-visible:outline-offset-2',
              'aria-expanded:bg-white/10 aria-expanded:text-white'
            )
          : cn(
              'flex items-center justify-center py-2 px-4 bg-white rounded-full',
              'text-black font-medium',
              'focus-visible:outline-blue-500 focus-visible:outline-offset-2'
            ),
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

function CaptionsButtonIcon({ state, className, ...rest }: { state: CaptionsButtonState } & ComponentProps<'svg'>) {
  const { active } = state;
  return (
    <>
      <CaptionsOffIcon {...rest} className={cn(className, { [iconHidden]: active })} />
      <CaptionsOnIcon {...rest} className={cn(className, { [iconHidden]: !active })} />
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

export function VideoSkinTailwind(props: VideoSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container
      className={cn(
        // Layout & containment
        'relative isolate overflow-clip @container/media-root',
        // Appearance
        'rounded-[var(--media-border-radius,2rem)] bg-black',
        'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-[0.8125rem] leading-normal subpixel-antialiased',
        // Resets
        '**:box-border **:m-0',
        '[&_button]:font-[inherit]',
        'motion-safe:[interpolate-size:allow-keywords]',
        // Inner highlight ring (::before)
        'before:absolute before:pointer-events-none before:rounded-[inherit] before:z-10',
        'before:inset-px before:ring-1 before:ring-inset before:ring-white/15',
        // Outer border ring (::after)
        'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
        'after:inset-0 after:ring-1 after:ring-inset after:ring-black/10',
        // Video element
        '[&>video]:block [&>video]:w-full [&>video]:h-full',
        // Poster image
        '[&>img]:absolute [&>img]:inset-0 [&>img]:w-full [&>img]:h-full',
        '[&>img]:object-cover [&>img]:pointer-events-none',
        '[&>img]:transition-opacity [&>img]:duration-[250ms]',
        '[&>img:not([data-visible])]:opacity-0',
        // Caption track CSS variables (consumed by native track container below)
        '[--media-caption-track-delay:600ms]',
        '[--media-caption-track-y:-0.5rem]',
        'has-[[data-controls][data-visible]]:[--media-caption-track-delay:25ms]',
        'has-[[data-controls][data-visible]]:[--media-caption-track-y:-3.5rem]',
        // Native caption track container
        '[&_video::-webkit-media-text-track-container]:transition-transform',
        '[&_video::-webkit-media-text-track-container]:duration-150',
        '[&_video::-webkit-media-text-track-container]:ease-out',
        '[&_video::-webkit-media-text-track-container]:delay-(--media-caption-track-delay)',
        '[&_video::-webkit-media-text-track-container]:translate-y-(--media-caption-track-y)',
        '[&_video::-webkit-media-text-track-container]:scale-98',
        '[&_video::-webkit-media-text-track-container]:z-1',
        '[&_video::-webkit-media-text-track-container]:font-[inherit]',
        'motion-reduce:[&_video::-webkit-media-text-track-container]:duration-50',
        // Fullscreen
        '[&:fullscreen]:rounded-none',
        className
      )}
      {...rest}
    >
      <BufferingIndicator
        render={(props, state) =>
          state.visible ? (
            <div
              {...props}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 text-white"
            >
              <div className={cn('p-1 rounded-full', surface)}>
                <SpinnerIcon className={icon} />
              </div>
            </div>
          ) : null
        }
      />

      <ErrorDialog
        aria-labelledby="media-error-title"
        aria-describedby="media-error-description"
        render={(props, { onDismiss }) => (
          <div
            {...props}
            className="peer/error group/error absolute inset-0 z-20 items-center justify-center pointer-events-none hidden data-[visible]:flex"
          >
            <div
              className={cn(
                'hidden flex-col gap-3 max-w-72 p-3 rounded-[1.75rem] text-white text-sm pointer-events-auto',
                'group-data-[visible]/error:flex',
                'transition-[display,opacity,scale,transform] duration-500 delay-100 transition-discrete',
                'starting:opacity-0 starting:scale-50',
                'ease-[linear(0,0.034_1.5%,0.763_9.7%,1.066_13.9%,1.198_19.9%,1.184_21.8%,0.963_37.5%,0.997_50.9%,1)]',
                surface
              )}
            >
              <div className="flex flex-col gap-2 px-2 pt-2 pb-1.5">
                <p id="media-error-title" className="font-semibold leading-tight">
                  Something went wrong.
                </p>
                <p id="media-error-description" className="opacity-70">
                  An error occurred while trying to play the video. Please try again.
                </p>
              </div>
              <div className="flex gap-2 *:flex-1">
                <Button onClick={onDismiss}>OK</Button>
              </div>
            </div>
          </div>
        )}
      />

      <Controls.Root
        data-controls="" // Used as a hook for Tailwind has-[] styles
        className={cn(
          // Peer marker for overlay/captions
          'peer/controls',
          // Surface
          surface,
          // Layout
          'absolute @container/media-controls bottom-3 inset-x-3',
          'p-[0.175rem] flex items-center gap-[0.075rem]',
          'text-white rounded-full z-10',
          // Transitions
          'will-change-[scale,transform,filter,opacity]',
          'transition-[scale,transform,filter,opacity] ease-out',
          'delay-0 duration-100 origin-bottom',
          // Hidden state
          'not-data-[visible]:pointer-events-none not-data-[visible]:blur-[8px]',
          'not-data-[visible]:scale-90 not-data-[visible]:opacity-0',
          'not-data-[visible]:delay-500 not-data-[visible]:duration-300',
          // Reduced motion + hidden
          'motion-reduce:not-data-[visible]:duration-100',
          'motion-reduce:not-data-[visible]:blur-none',
          'motion-reduce:not-data-[visible]:scale-100',
          // Wider container
          '@2xl/media-root:p-1 @2xl/media-root:gap-0.5'
        )}
      >
        <PlayButton
          render={(props, state) => (
            <Button variant="icon" {...props}>
              <PlayButtonIcon state={state} className={icon} />
            </Button>
          )}
        />

        <SeekButton
          seconds={-SEEK_TIME}
          render={(props) => (
            <Button variant="icon" {...props} className="@max-md/media-controls:hidden">
              <span className="relative">
                <SeekIcon className={cn(icon, '[scale:-1_1]')} />
                <span className="absolute left-0 -bottom-0.75 text-[0.75em] font-[480] tabular-nums">{SEEK_TIME}</span>
              </span>
            </Button>
          )}
        />

        <SeekButton
          seconds={SEEK_TIME}
          render={(props) => (
            <Button variant="icon" {...props} className="@max-md/media-controls:hidden">
              <span className="relative">
                <SeekIcon className={icon} />
                <span className="absolute right-0 -bottom-0.75 text-[0.75em] font-[480] tabular-nums">{SEEK_TIME}</span>
              </span>
            </Button>
          )}
        />

        <Time.Group className="@container/media-time flex items-center flex-1 gap-3 px-2">
          <Time.Value
            type="current"
            className="hidden @2xs/media-time:block text-shadow-2xs text-shadow-black/25 tabular-nums"
          />
          {/* Temporary spacer */}
          <div className="flex-1 h-1 rounded-full bg-white/20" />
          <Time.Value type="duration" className="text-shadow-2xs text-shadow-black/25 tabular-nums" />
        </Time.Group>

        <MuteButton
          render={(props, state) => (
            <Button variant="icon" {...props}>
              <MuteButtonIcon state={state} className={icon} />
            </Button>
          )}
        />

        <CaptionsButton
          render={(props, state) => (
            <Button variant="icon" {...props}>
              <CaptionsButtonIcon state={state} className={icon} />
            </Button>
          )}
        />

        <PiPButton
          render={(props) => (
            <Button variant="icon" {...props}>
              <PipIcon className={icon} />
            </Button>
          )}
        />

        <FullscreenButton
          render={(props, state) => (
            <Button variant="icon" {...props}>
              <FullscreenButtonIcon state={state} className={icon} />
            </Button>
          )}
        />
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
          'peer-data-[visible]/controls:-translate-y-12 peer-data-[visible]/controls:delay-25',
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
          // Default: hidden
          'opacity-0',
          'bg-gradient-to-t from-black/50 via-black/30 to-transparent',
          'backdrop-blur-[0px] backdrop-saturate-120 backdrop-brightness-90',
          // Transitions
          'transition-[opacity,backdrop-filter] ease-out',
          'duration-300 delay-500',
          // Shown when controls visible
          'peer-data-[visible]/controls:opacity-100',
          'peer-data-[visible]/controls:duration-150',
          'peer-data-[visible]/controls:delay-0',
          // Shown when error visible (+ blur)
          'peer-data-[visible]/error:opacity-100',
          'peer-data-[visible]/error:duration-150',
          'peer-data-[visible]/error:delay-0',
          'peer-data-[visible]/error:backdrop-blur-[8px]',
          // Reduced motion
          'motion-reduce:duration-100'
        )}
      />

      {children}
    </Container>
  );
}
