import { ChevronIcon } from '@/icons';

export function MenuChevron({
  flipped = false,
}: {
  flipped?: boolean;
} = {}) {
  return (
    <ChevronIcon className={flipped ? 'media-icon media-chevron media-chevron-flipped' : 'media-icon media-chevron'} />
  );
}
