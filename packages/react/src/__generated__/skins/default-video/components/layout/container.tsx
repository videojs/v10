import { Container as ContainerPrimitive } from '@/player/container';
import { cn } from '@videojs/utils/style';
import type { ContainerProps } from '@/player/container';

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <ContainerPrimitive {...props} className={cn('media-container', className)}>
      {children}
    </ContainerPrimitive>
  );
}
