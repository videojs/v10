'use client';

import { MuxVideoMedia } from '@videojs/core/dom/media/mux';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

interface MuxVideoMediaProps
  extends Partial<
    Pick<
      MuxVideoMedia,
      | 'src'
      | 'type'
      | 'preferPlayback'
      | 'config'
      | 'debug'
      | 'preload'
      | 'castReceiver'
      | 'castSrc'
      | 'castContentType'
      | 'castStreamType'
      | 'castCustomData'
      | 'envKey'
      | 'metadata'
      | 'MuxDataSdk'
      | 'beaconCollectionDomain'
      | 'disableCookies'
      | 'playerSoftwareName'
      | 'playerSoftwareVersion'
      | 'playerInitTime'
    >
  > {}

export interface MuxVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof MuxVideoMediaProps>,
    MuxVideoMediaProps {
  children?: ReactNode;
}

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo(
  {
    children,
    src,
    type,
    preferPlayback,
    config,
    debug,
    preload,
    castReceiver,
    castSrc,
    castContentType,
    castStreamType,
    castCustomData,
    envKey,
    metadata,
    MuxDataSdk,
    beaconCollectionDomain,
    disableCookies,
    playerSoftwareName,
    playerSoftwareVersion,
    playerInitTime,
    ...htmlProps
  },
  ref
) {
  const media = useMediaInstance(MuxVideoMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);

  if (src !== undefined && media.src !== src) media.src = src;
  if (media.type !== type) media.type = type;
  if (media.preferPlayback !== preferPlayback) media.preferPlayback = preferPlayback;
  if (config !== undefined && media.config !== config) media.config = config;
  if (debug !== undefined && media.debug !== debug) media.debug = debug;
  if (preload !== undefined && media.preload !== preload) media.preload = preload;
  if (media.castReceiver !== castReceiver) media.castReceiver = castReceiver;
  if (castSrc !== undefined && media.castSrc !== castSrc) media.castSrc = castSrc;
  if (media.castContentType !== castContentType) media.castContentType = castContentType;
  if (media.castStreamType !== castStreamType) media.castStreamType = castStreamType;
  if (media.castCustomData !== castCustomData) media.castCustomData = castCustomData;
  if (media.envKey !== envKey) media.envKey = envKey;
  if (media.metadata !== metadata) media.metadata = metadata;
  if (media.MuxDataSdk !== MuxDataSdk) media.MuxDataSdk = MuxDataSdk;
  if (media.beaconCollectionDomain !== beaconCollectionDomain) media.beaconCollectionDomain = beaconCollectionDomain;
  if (disableCookies !== undefined && media.disableCookies !== disableCookies) media.disableCookies = disableCookies;
  if (media.playerSoftwareName !== playerSoftwareName) media.playerSoftwareName = playerSoftwareName;
  if (media.playerSoftwareVersion !== playerSoftwareVersion) media.playerSoftwareVersion = playerSoftwareVersion;
  if (media.playerInitTime !== playerInitTime) media.playerInitTime = playerInitTime;

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace MuxVideo {
  export type Props = MuxVideoProps;
}
