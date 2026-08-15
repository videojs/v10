import { ChevronIcon } from '@videojs/react/icons';

export function MenuChevron({
  flipped = false,
}: {
  flipped?: boolean;
} = {}) {
  return (
    <ChevronIcon
      className={
        flipped
          ? 'size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100 size-3.5 rotate-180'
          : 'size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100 size-3.5'
      }
    />
  );
}
