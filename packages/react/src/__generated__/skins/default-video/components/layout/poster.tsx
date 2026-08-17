import { Poster as PosterPrimitive } from '@/ui/poster';
import { cn } from '@videojs/utils/style';
import type { PosterProps } from '@/ui/poster';

export function Poster({ className, ...props }: PosterProps) {
  return (
    <PosterPrimitive
      {...props}
      className={(state) => cn('media-poster', typeof className === 'function' ? className(state) : className)}
    />
  );
}
