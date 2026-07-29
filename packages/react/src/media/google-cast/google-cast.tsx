'use client';

import type { GoogleCastProps as GoogleCastComponentProps } from '@videojs/media/dom/google-cast';
import { GoogleCast as GoogleCastComponent, googleCastDefaultProps } from '@videojs/media/dom/google-cast';
import type { ReactNode } from 'react';

import { useMediaComponent } from '../../utils/use-media-component';
import { useSyncProps } from '../../utils/use-sync-props';

export type GoogleCastProps = Partial<GoogleCastComponentProps>;

/**
 * Adds Google Cast support to the surrounding player's media.
 *
 * Renders nothing — place it inside the player provider as a sibling of the
 * media component (e.g. `<HlsJsVideo />`) and it registers a `GoogleCast`
 * media component with the active media.
 *
 * @example
 * ```tsx
 * <Player.Provider>
 *   <HlsJsVideo src="https://example.com/stream.m3u8" />
 *   <GoogleCast receiver="YOUR_APP_ID" />
 * </Player.Provider>
 * ```
 */
export function GoogleCast(props: GoogleCastProps): ReactNode {
  const component = useMediaComponent(GoogleCastComponent);

  useSyncProps(component, props, googleCastDefaultProps);

  return null;
}

export namespace GoogleCast {
  export type Props = GoogleCastProps;
}
