import { VolumeIndicator as VolumeIndicatorPrimitive } from '@videojs/react';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/react/icons';
import { cn, resolveClassName } from '@/components/videojs/utils';

export interface VolumeIndicatorProps extends Omit<VolumeIndicatorPrimitive.RootProps, 'children'> {}

export function VolumeIndicator({ className, ...props }: VolumeIndicatorProps) {
  return (
    <VolumeIndicatorPrimitive.Root
      {...props}
      className={(state) =>
        cn(
          'group/volume-status pointer-events-none font-medium',
          'transition-[opacity,scale,translate] duration-100 ease-out',
          'data-starting-style:opacity-0 data-ending-style:opacity-0',
          'text-media-controls shadow-media-surface [backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
          'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
          'after:shadow-[inset_0_1px_0_0_var(--media-surface-inner-border),inset_0_0_0_1px_oklch(from_var(--media-surface-inner-border)_l_c_h/calc(alpha*0.5))]',
          'absolute top-3 w-[min(80%,12rem)] rounded-media-pill bg-black/25',
          'data-starting-style:scale-90',
          'data-ending-style:-translate-y-1/4 data-ending-style:scale-90',
          resolveClassName(className, state),
        )
      }
    >
      <VolumeIndicatorPrimitive.Fill
        className={cn(
          'flex items-center justify-between gap-2 rounded-[inherit] px-2.5 py-1',
          'bg-left bg-no-repeat [background-image:linear-gradient(var(--media-accent-color,var(--media-default-accent-color)),var(--media-accent-color,var(--media-default-accent-color)))]',
          '[background-size:var(--media-volume-fill,0%)_100%] transition-[background-size] duration-200 ease-linear',
          'w-full',
        )}
      >
        <VolumeHighIcon className={cn('hidden shrink-0', 'group-data-[level=high]/volume-status:block')} />
        <VolumeLowIcon className={cn('hidden shrink-0', 'group-data-[level=low]/volume-status:block')} />
        <VolumeOffIcon className={cn('hidden shrink-0', 'group-data-[level=off]/volume-status:block')} />
        <VolumeIndicatorPrimitive.Value className="ml-auto" />
      </VolumeIndicatorPrimitive.Fill>
    </VolumeIndicatorPrimitive.Root>
  );
}
