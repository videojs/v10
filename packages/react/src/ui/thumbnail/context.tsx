import type { ThumbnailState } from '@videojs/core';
import type { MediaTextTrackState } from '@videojs/media';
import { createContext, type CSSProperties, type ProviderProps, type RefObject, useContext } from 'react';

export interface ThumbnailContextValue {
  state: ThumbnailState;
  src: string | undefined;
  imageStyle: CSSProperties | undefined;
  thumbnailTrackCrossOrigin: MediaTextTrackState['thumbnailTrackCrossOrigin'] | undefined;
  inheritsCrossOrigin: boolean;
  imageRef: RefObject<HTMLImageElement | null>;
  connectImage: () => void;
  disconnectImage: (img: HTMLImageElement) => void;
}

const ThumbnailContext = createContext<ThumbnailContextValue | null>(null);

export function ThumbnailProvider({ value, children }: ProviderProps<ThumbnailContextValue>) {
  return <ThumbnailContext.Provider value={value}>{children}</ThumbnailContext.Provider>;
}

export function useThumbnailContext(): ThumbnailContextValue {
  const ctx = useContext(ThumbnailContext);
  if (!ctx) throw new Error('Thumbnail compound components must be used within a Thumbnail.Root');

  return ctx;
}
