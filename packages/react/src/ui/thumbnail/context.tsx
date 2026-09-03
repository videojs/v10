import type { ThumbnailCore, ThumbnailFetchPriority, ThumbnailImage } from '@videojs/core';
import type { CSSProperties, RefObject } from 'react';
import { createContext, useContext } from 'react';

interface ThumbnailContextValue {
  fetchPriority: ThumbnailFetchPriority | undefined;
  imgRef: RefObject<HTMLImageElement | null>;
  imgStyle: CSSProperties | undefined;
  loading: HTMLImageElement['loading'] | undefined;
  resolvedCrossOrigin: HTMLImageElement['crossOrigin'] | undefined;
  state: ThumbnailCore.State;
  thumbnail: ThumbnailImage | undefined;
}

const ThumbnailContext = createContext<ThumbnailContextValue | null>(null);

export const ThumbnailProvider = ThumbnailContext.Provider;

export function useThumbnailContext(): ThumbnailContextValue {
  const ctx = useContext(ThumbnailContext);
  if (!ctx) throw new Error('Thumbnail compound components must be used within a Thumbnail.Root');

  return ctx;
}
