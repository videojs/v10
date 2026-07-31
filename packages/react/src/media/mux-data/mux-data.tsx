'use client';

import type { MuxDataProps as MuxDataComponentProps } from '@videojs/media/dom/mux';
import { MuxData as MuxDataComponent, muxDataDefaultProps } from '@videojs/media/dom/mux';
import type { ReactNode } from 'react';

import { useMediaComponent } from '../../utils/use-media-component';
import { useSyncProps } from '../../utils/use-sync-props';

export type MuxDataProps = Partial<MuxDataComponentProps>;

/**
 * Adds [Mux Data](https://www.mux.com/data) monitoring to the surrounding
 * player's media.
 *
 * Renders nothing — place it inside the player provider as a sibling of the
 * media component (e.g. `<MuxVideo />`) and it registers a `MuxData` media
 * component with the active media.
 *
 * Mux-hosted playback needs no `envKey`: the view reports the Mux playback ID
 * as its `video_id`, which Mux attributes to the owning environment. Set
 * `envKey` to monitor sources Mux doesn't host.
 *
 * @example
 * ```tsx
 * <Player.Provider>
 *   <MuxVideo source={{ playbackId: 'abc123' }} />
 *   <MuxData playerSoftwareName="mux-video" />
 * </Player.Provider>
 * ```
 */
export function MuxData(props: MuxDataProps): ReactNode {
  const component = useMediaComponent(MuxDataComponent);
  const { MuxDataSdk, ...rest } = props;

  // `useSyncProps` treats an `undefined` prop as "reset to the default", but
  // `MuxDataSdk={undefined}` is how consumers disable monitoring. Sync it here
  // instead: passing the prop wins even when its value is `undefined`, and only
  // omitting it falls back to the default SDK.
  const sdk = 'MuxDataSdk' in props ? MuxDataSdk : muxDataDefaultProps.MuxDataSdk;
  if (component.MuxDataSdk !== sdk) component.MuxDataSdk = sdk;

  useSyncProps(component, rest, muxDataDefaultProps);

  return null;
}

export namespace MuxData {
  export type Props = MuxDataProps;
}
