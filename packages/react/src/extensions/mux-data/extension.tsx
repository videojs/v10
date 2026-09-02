'use client';

import { MuxDataExtension, type MuxDataExtensionProps } from '@videojs/mux-data';
import type { ReactNode } from 'react';

import { useMediaComponent } from '../../utils/use-media-component';
import { useSyncProps } from '../../utils/use-sync-props';

export type MuxDataProps = Partial<MuxDataExtensionProps>;

/**
 * Adds the [Mux Data](https://www.mux.com/data) extension to the surrounding player's media.
 *
 * Renders nothing — place it inside the Player as a sibling of the media component (e.g. `<MuxVideo />`) and it follows
 * the active media.
 *
 * Mux-hosted playback needs no `envKey`: the view reports the Mux playback ID as its `video_id`, which Mux attributes
 * to the owning environment. Set `envKey` to monitor sources Mux doesn't host.
 *
 * Any media component works. When the media plays through an hls.js or dash.js engine, that engine is handed to the Mux
 * Data SDK so the view also carries stream-level detail such as rendition switches and request timing.
 *
 * @example
 *   ```tsx
 *   <Player>
 *     <MuxVideo source={{ playbackId: 'abc123' }} />
 *     <MuxData playerSoftwareName="mux-video" />
 *   </Player>;
 *   ```;
 */
export function MuxData(props: MuxDataProps): ReactNode {
  const component = useMediaComponent(MuxDataExtension);
  const { MuxDataSdk, ...rest } = props;

  // `useSyncProps` treats an `undefined` prop as "reset to the default", but
  // `MuxDataSdk={undefined}` is how consumers disable monitoring. Sync it here
  // instead: passing the prop wins even when its value is `undefined`, and only
  // omitting it falls back to the default SDK.
  const sdk = 'MuxDataSdk' in props ? MuxDataSdk : MuxDataExtension.defaultProps.MuxDataSdk;

  if (component.MuxDataSdk !== sdk) component.MuxDataSdk = sdk;

  useSyncProps(component, rest, MuxDataExtension.defaultProps);

  return null;
}

export namespace MuxData {
  export type Props = MuxDataProps;
}
