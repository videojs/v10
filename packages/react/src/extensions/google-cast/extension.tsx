'use client';

import { GoogleCastExtension, type GoogleCastExtensionProps } from '@videojs/google-cast';
import type { ReactNode } from 'react';

import { useMediaComponent } from '../../utils/use-media-component';
import { useSyncProps } from '../../utils/use-sync-props';

export type GoogleCastProps = Partial<GoogleCastExtensionProps>;

/**
 * Adds the Google Cast extension to the surrounding player's media.
 *
 * Renders nothing — place it inside the Player as a sibling of the media component (e.g. `<HlsJsVideo />`) and it
 * follows the active media.
 *
 * @example
 *   ```tsx
 *   <Player>
 *     <HlsJsVideo src="https://example.com/stream.m3u8" />
 *     <GoogleCast receiver="YOUR_APP_ID" />
 *   </Player>;
 *   ```;
 */
export function GoogleCast(props: GoogleCastProps): ReactNode {
  const component = useMediaComponent(GoogleCastExtension);

  useSyncProps(component, props, GoogleCastExtension.defaultProps);

  return null;
}

export namespace GoogleCast {
  export type Props = GoogleCastProps;
}
