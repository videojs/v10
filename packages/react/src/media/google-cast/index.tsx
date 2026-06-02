'use client';

import { isMediaRemotePlaybackHost, selectSource } from '@videojs/core/dom';
import { GoogleCast as GoogleCastCore } from '@videojs/core/dom/media/google-cast';
import { useEffect, useMemo, useState } from 'react';
import { useDestroy } from '@/utils/use-destroy';
import { useMedia, useOptionalPlayer } from '../../player/context';

export interface GoogleCastProps extends Partial<GoogleCastCore.Props> {}

export function GoogleCast({ src, receiver, contentType, streamType, customData }: GoogleCastProps): null {
  const media = useMedia();
  const [cast] = useState(() => new GoogleCastCore());
  const source = useOptionalPlayer((state) => selectSource(state)?.source ?? null);

  const resolvedProps = useMemo(
    () => ({
      src: src ?? source ?? undefined,
      receiver,
      contentType,
      streamType,
      customData,
    }),
    [src, source, receiver, contentType, streamType, customData]
  );

  useDestroy(cast);

  useEffect(() => {
    if (!media || !cast.supported || !isMediaRemotePlaybackHost(media)) return;

    media.setRemoteMedia(cast);

    return () => {
      media.setRemoteMedia(null);
    };
  }, [cast, media]);

  useEffect(() => {
    cast.setProps(resolvedProps);
  }, [cast, resolvedProps]);

  return null;
}

export namespace GoogleCast {
  export type Props = GoogleCastProps;
}
