import type { ButtonProps as ButtonPrimitiveProps } from '@base-ui-components/react/button';
import type { SliderRootProps } from '@base-ui-components/react/slider';
import type { ComponentProps, PropsWithChildren } from 'react';
import { Button as ButtonPrimitive } from '@base-ui-components/react/button';
import { Popover as PopoverPrimitive } from '@base-ui-components/react/popover';
import { Slider as SliderPrimitive } from '@base-ui-components/react/slider';
import { Tooltip as TooltipPrimitive } from '@base-ui-components/react/tooltip';

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/16/solid';
import {
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import {
  MediaContainer,
  useCurrentTimeDisplayState,
  useFullscreenButtonState,
  useMuteButtonState,
  usePlayButtonState,
  useTimeSliderRootState,
  useVolumeSliderRootState,
} from '@videojs/react-preview';
import { formatDisplayTime } from '@videojs/utils-preview';

import clsx from 'clsx';
import { useCallback, useState } from 'react';

type SkinProps = PropsWithChildren<{
  className?: string;
}>;

function Surface(props: ComponentProps<'div'>) {
  const { className, ...rest } = props;
  return (
    <div
      className={clsx(
        // Background
        'bg-linear-to-t to-zinc-50/80 from-zinc-100/80 backdrop-blur-md dark:from-zinc-950/80 dark:to-zinc-900/80',
        // Border & shadow
        'ring-1 ring-black/5 shadow-xs shadow-black/15 dark:ring-white/15',
        // Text
        'text-zinc-900 dark:text-zinc-50',
        className,
      )}
      {...rest}
    />
  );
}

function Popup(props: ComponentProps<typeof Surface>) {
  const { className, ...rest } = props;
  return (
    <Surface
      className={clsx(
        'origin-(--transform-origin) transition data-instant:duration-0 translate-y-0',
        'data-starting-style:scale-90 data-starting-style:translate-y-1 data-starting-style:opacity-0',
        'data-ending-style:scale-90 data-ending-style:translate-y-1 data-ending-style:opacity-0',
        className,
      )}
      {...rest}
    />
  );
}

function TooltipPopup(props: ComponentProps<typeof TooltipPrimitive.Popup>) {
  const { className, ...rest } = props;
  return (
    <TooltipPrimitive.Popup
      render={props => <Popup {...props} className="rounded-md px-2 py-1 text-xs" />}
      {...rest}
    />
  );
}

const Tooltip = {
  ...TooltipPrimitive,
  Popup: TooltipPopup,
};

function PopoverPopup(props: ComponentProps<typeof PopoverPrimitive.Popup>) {
  const { className, ...rest } = props;
  return (
    <PopoverPrimitive.Popup
      render={props => <Popup {...props} className="rounded-lg py-3 px-1.5" />}
      {...rest}
    />
  );
}

const Popover = {
  ...PopoverPrimitive,
  Popup: PopoverPopup,
};

type ButtonProps = Omit<ButtonPrimitiveProps, 'className'>;

function Button(props: ButtonProps) {
  return (
    <ButtonPrimitive
      className={clsx(
        'flex p-1.75 hover:bg-black/5 text-zinc-700 hover:text-zinc-800 transition-colors rounded-md outline-2 outline-transparent',
        // Focus styles
        'focus-visible:outline-zinc-700',
        // Dark styles
        'dark:text-zinc-100 dark:hover:text-white dark:hover:bg-white/10 dark:focus-visible:outline-zinc-300',

      )}
      {...props}
    />
  );
}

function PlayButton() {
  const { paused, requestPause, requestPlay } = usePlayButtonState();

  const onClick = useCallback(() => {
    if (paused) {
      requestPlay();
    } else {
      requestPause();
    }
  }, [paused, requestPlay, requestPause]);

  const label = paused ? 'Play' : 'Pause';

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={(
        <Button onClick={onClick} data-paused={paused ? '' : undefined}>
          {paused ? <PlayIcon className="size-5" /> : <PauseIcon className="size-5" />}
          <span className="sr-only">{label}</span>
        </Button>
      )}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={12} align="start">
          <Tooltip.Popup>
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function MuteButton() {
  const { muted, requestMute, requestUnmute } = useMuteButtonState();
  const [open, setOpen] = useState(false);

  const onClick = useCallback(() => {
    if (muted) {
      requestUnmute();
    } else {
      requestMute();
    }
  }, [muted, requestMute, requestUnmute]);

  const handleOpenChange = useCallback((isOpen: boolean, eventDetails: PopoverPrimitive.Root.ChangeEventDetails) => {
    // Don't close when clicking the trigger button - only allow hover to control it
    if (!isOpen && eventDetails?.reason === 'trigger-press') return;
    setOpen(isOpen);
  }, []);

  const label = muted ? 'Unmute' : 'Mute';

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        openOnHover
        delay={20}
        closeDelay={200}
        render={(
          <Button onClick={onClick}>
            {muted ? <SpeakerXMarkIcon className="size-5" /> : <SpeakerWaveIcon className="size-5" />}
            <span className="sr-only">{label}</span>
          </Button>
        )}
      />

      <Popover.Portal>
        <Popover.Backdrop />
        <Popover.Positioner sideOffset={12} side="top">
          <Popover.Popup className="flex items-center justify-center">
            <VolumeSlider />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FullscreenButton() {
  const { fullscreen, requestEnterFullscreen, requestExitFullscreen } = useFullscreenButtonState();

  const onClick = useCallback(() => {
    if (fullscreen) {
      requestExitFullscreen();
    } else {
      requestEnterFullscreen();
    }
  }, [fullscreen, requestEnterFullscreen, requestExitFullscreen]);

  const label = fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={(
        <Button onClick={onClick}>
          {fullscreen
            ? <XMarkIcon className="size-5" />
            : (
                <div className="grid [&_svg]:[grid-area:1/1] size-5 place-content-center">
                  <ArrowDownLeftIcon className="size-4 -translate-x-0.5 translate-y-0.5" />
                  <ArrowUpRightIcon className="size-4 translate-x-0.5 -translate-y-0.5" />
                </div>
              )}
          <span className="sr-only">{label}</span>
        </Button>
      )}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={12} align="end">
          <Tooltip.Popup>
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

type SliderProps = Pick<SliderRootProps<number>, 'min' | 'max' | 'step' | 'value' | 'onValueChange' | 'orientation'>;

function Slider(props: SliderProps) {
  return (
    <SliderPrimitive.Root
      {...props}
      thumbAlignment="edge"
      className="flex-1 group/slider"
    >
      <SliderPrimitive.Control className={clsx(
        'flex items-center',
        'data-[orientation="horizontal"]:h-5 data-[orientation="horizontal"]:min-w-20',
        'data-[orientation="vertical"]:w-5 data-[orientation="vertical"]:h-20 data-[orientation="vertical"]:justify-center',
      )}
      >
        <SliderPrimitive.Track className={clsx(
          'relative select-none rounded-full bg-black/10 dark:bg-white/10',
          'data-[orientation="horizontal"]:w-full data-[orientation="horizontal"]:h-1',
          'data-[orientation="vertical"]:w-1 data-[orientation="vertical"]:h-full',
        )}
        >
          <SliderPrimitive.Indicator className="bg-zinc-700 dark:bg-white rounded-[inherit]" />
          <SliderPrimitive.Thumb className={clsx(
            'z-10 bg-white size-3 select-none ring ring-black/10 rounded-full shadow-xs shadow-black/15 transition-opacity ease-in-out',
            // Focus styles (the hidden input inside the thumb gets focus)
            '-outline-offset-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-zinc-500',
          )}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

function TimeSlider() {
  // TODO: Expose something like _fillWidth to facilitate debouncing etc.
  const { currentTime, duration, requestSeek } = useTimeSliderRootState();

  return (
    <Slider
      // FIXME: If seems that currentTime can be undefined initially
      value={currentTime ?? 0}
      // FIXME: If seems that duration can be undefined initially
      // Base UI will throw an error if max is less than min (which is 0)
      max={!duration ? 1 : duration}
      step={0.1}
      onValueChange={requestSeek}
    />
  );
}

function VolumeSlider() {
  const { volume, muted, requestVolumeChange } = useVolumeSliderRootState();
  // FIXME: If seems that volume can be undefined initially, despite the types.
  const value = muted ? 0 : volume ?? 0;

  return (
    <Slider
      value={value}
      max={1}
      step={0.1}
      onValueChange={requestVolumeChange}
      orientation="vertical"
    />
  );
}

interface TimeDisplayProps {
  type: 'current' | 'duration';
  className?: string;
}

function TimeDisplay(props: TimeDisplayProps) {
  const { type, className } = props;
  const { duration, currentTime } = useCurrentTimeDisplayState();
  const value = formatDisplayTime(type === 'current' ? currentTime : duration);

  return <span className={clsx('tabular-nums', className)}>{value}</span>;
}

export default function CustomBaseUISkin({ children, className }: SkinProps): JSX.Element {
  return (
    <MediaContainer className={clsx(
      'relative isolate @container/root group/root overflow-clip bg-black rounded-xl',
      // Base typography
      'font-sans text-[0.8125rem] subpixel-antialiased',
      // Fancy borders
      'after:absolute after:inset-0 after:ring-black/10 after:ring-1 dark:after:ring-white/10 after:ring-inset after:z-10 after:pointer-events-none after:rounded-[inherit]',
      // Prevent rounded corners in fullscreen
      '[&:fullscreen]:rounded-none',
      // Ensure the nested video inherits the radius
      '[&_video]:w-full [&_video]:h-full',
      className,
    )}
    >
      {/* FIXME: Mismatch between React 18 & 19 types */}
      {children as any}

      <Surface className={clsx(
        '@container/controls absolute inset-x-2 bottom-2 justify-end z-20 p-1 rounded-lg flex items-center gap-0.5',
        // Animation
        'transition ease-in-out',
        //  FIXME: Temporary hide/show logic
        'opacity-0 scale-[0.98] blur-sm delay-500 pointer-events-none origin-bottom',
        'has-data-paused:opacity-100 has-data-paused:scale-100 has-data-paused:blur-none has-data-paused:delay-0 has-data-paused:pointer-events-auto',
        'group-hover/root:opacity-100 group-hover/root:scale-100 group-hover/root:blur-none group-hover/root:delay-0 group-hover/root:pointer-events-auto',
      )}
      >
        <Tooltip.Provider>
          <PlayButton />

          <div className="flex items-center gap-2.5 px-2 flex-1">
            <div className="flex items-center gap-1">
              <TimeDisplay type="current" />
              <span className="opacity-50">/</span>
              <TimeDisplay type="duration" className="opacity-50" />
            </div>

            <TimeSlider />
          </div>

          <MuteButton />

          <FullscreenButton />
        </Tooltip.Provider>
      </Surface>
    </MediaContainer>
  );
};
