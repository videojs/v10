import { useMemo } from 'react';
import { getPosterSrc } from '../sources';
import { useSource } from './use-source';

/**
 * The poster URL for the skin's `poster` prop.
 *
 * Unlike the HTML templates' `<img slot="poster">`, this cannot carry
 * `crossorigin`, so React posters stay blocked in the cross-origin-isolated
 * StackBlitz previews. Passing an element instead is not a fix: `Poster` tracks
 * its blur-up load state from its own `src` prop, which a skin leaves unset when
 * it forwards an element through `render`, so `data-loaded` inverts and the
 * poster fades out once it loads.
 */
export function usePoster(): string | undefined {
  const source = useSource();
  return useMemo(() => getPosterSrc(source), [source]);
}
