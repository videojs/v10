import { Container as ContainerPrimitive } from '@/player/container';
import { cn } from '@videojs/utils/style';

export interface ContainerProps extends ContainerPrimitive.Props {}

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <ContainerPrimitive {...props} className={cn('media-container', className)}>
      {children}
    </ContainerPrimitive>
  );
}
