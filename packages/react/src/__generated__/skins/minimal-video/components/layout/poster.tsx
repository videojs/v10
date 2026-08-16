import { Poster as PosterPrimitive } from '@/ui/poster';
import { cn } from '@videojs/utils/style';

export interface PosterProps extends PosterPrimitive.Props {}

export function Poster({ className, ...props }: PosterProps) {
  return (
    <PosterPrimitive
      {...props}
      className={(state) => cn('media-poster', typeof className === 'function' ? className(state) : className)}
    />
  );
}
