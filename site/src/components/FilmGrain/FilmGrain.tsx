import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import texture from './texture.svg?raw';

const textureUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(texture)}`;

interface Props {
  currentPath: string;
  className?: string;
}

export default function FilmGrain({ currentPath, className }: Props) {
  return (
    <div
      className={twMerge(
        clsx(
          'absolute w-full h-full top-0 left-0 pointer-events-none mix-blend-overlay z-10',
          currentPath.startsWith('/docs') ? 'opacity-70 dark:opacity-50' : 'opacity-70 dark:opacity-60'
        ),
        className
      )}
      style={{
        backgroundImage: `url("${textureUrl}")`,
        backgroundPosition: `0% 0%`,
        backgroundRepeat: `repeat`,
      }}
    />
  );
}
