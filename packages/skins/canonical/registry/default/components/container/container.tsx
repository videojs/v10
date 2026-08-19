import { Container as ContainerPrimitive } from '@videojs/react';
import { cn } from '@videojs/utils/style';
import type { ContainerProps } from '@videojs/react';

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <ContainerPrimitive
      {...props}
      className={cn(
        'relative isolate block h-full w-full overflow-hidden rounded-media-surface bg-black @container/media-container [&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:rounded-[inherit] [&_video]:[object-fit:var(--media-object-fit,contain)] [&_video]:[object-position:var(--media-object-position,center)]',
        className,
      )}
    >
      {children}
    </ContainerPrimitive>
  );
}
