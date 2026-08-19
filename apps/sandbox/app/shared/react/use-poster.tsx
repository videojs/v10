import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { getPosterSrc } from '../sources';
import { useSource } from './use-source';

/**
 * The poster as an element rather than a `poster={url}` string, so it can carry
 * `crossorigin`. This sandbox is published as a StackBlitz template, and those
 * previews are cross-origin isolated (COEP `require-corp`), where a no-CORS
 * image from image.mux.com is blocked outright.
 */
export function usePoster(): ReactElement | undefined {
  const source = useSource();
  const src = useMemo(() => getPosterSrc(source), [source]);

  return src ? <img src={src} alt="Video poster" crossOrigin="anonymous" /> : undefined;
}
