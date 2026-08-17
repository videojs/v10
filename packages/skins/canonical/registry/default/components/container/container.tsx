import { Container as ContainerPrimitive } from '@videojs/react';
import { cn } from '@videojs/utils/style';
import type { ContainerProps } from '@videojs/react';

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <ContainerPrimitive
      {...props}
      className={cn(
        'relative isolate block h-full w-full overflow-hidden rounded-media-surface bg-black @container/media-container [&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:rounded-[inherit] [&_video]:[object-fit:var(--media-object-fit,contain)] [&_video]:[object-position:var(--media-object-position,center)] before:pointer-events-none before:absolute before:inset-0 before:[background-image:var(--media-poster-placeholder,none)] before:bg-no-repeat before:[background-position:var(--media-object-position,center)] before:[background-size:var(--media-object-fit,contain)] before:opacity-0 before:[filter:blur(var(--media-poster-placeholder-blur,20px))] before:transition-opacity before:duration-250 has-[img[data-visible]:not([data-loaded])]:before:opacity-100',
        className,
      )}
    >
      {children}
    </ContainerPrimitive>
  );
}
