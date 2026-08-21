'use client';

import type { WistiaMediaProps, WistiaPlayer, WistiaSource } from '@videojs/media/dom/wistia';
// This entry is where `@wistia/wistia-player` is imported, so the tag below cannot outrun its definition.
import {
  normalizeWistiaPlayer,
  parseWistiaMediaId,
  parseWistiaStartTime,
  WISTIA_PLAYER_TAG,
  wistiaAttributes,
  wistiaMediaOptions,
  wistiaPlayerStyle,
} from '@videojs/media/dom/wistia';
import type { ForwardRefExoticComponent, HTMLAttributes, RefAttributes, RefCallback } from 'react';
import { createElement, forwardRef, useCallback, useState } from 'react';
import { useMediaAttach } from '../../player/context';
import { useComposedRefs } from '../../utils/use-composed-refs';

export interface WistiaVideoProps extends Partial<Omit<WistiaMediaProps, 'source'>>, HTMLAttributes<WistiaPlayer> {
  /** Wistia's own options, `mediaId` among them: everything the player understands that a media does not. */
  source?: WistiaSource | null;
}

/**
 * Wistia is the one media here that ships a web component of its own, so this renders that component rather
 * than a player of its own making, and `@videojs/media/dom/wistia` registers it statically — the element the
 * ref hands back is already a Wistia player. Wistia's own React wrapper defines it from an effect, a tick too
 * late: the store reads a media once, as it attaches, and a bare `HTMLElement` is a media that cannot seek,
 * buffer, or name a source.
 *
 * The translation is one layer thin. `source` carries Wistia's own options — `mediaId`, `playerColor`,
 * `qualityMin` — straight through, so anything the player understands stays reachable without this component
 * knowing about it; the rest is the handful a media names differently. The element itself is what the store
 * attaches to, normalized in place, so the ref hands back one object that is both.
 */
export const WistiaVideo: ForwardRefExoticComponent<WistiaVideoProps & RefAttributes<WistiaPlayer>> = forwardRef<
  WistiaPlayer,
  WistiaVideoProps
>(function WistiaVideo(
  {
    autoplay,
    children,
    controls = false,
    defaultMuted,
    loop,
    muted,
    // Wistia has no inline-playback knob and plays inline, so this is accepted and goes no further.
    playsInline: _playsInline,
    poster,
    preload,
    source,
    src,
    style,
    ...rest
  },
  ref
) {
  const setMedia = useMediaAttach();

  const attachRef = useCallback<RefCallback<WistiaPlayer>>(
    (element) => {
      // No cast: this is where Wistia's real class is held to the contract the normalizer describes.
      if (element) normalizeWistiaPlayer(element);
      setMedia?.(element as never);
    },
    [setMedia]
  );
  const composedRef = useComposedRefs(attachRef, ref);

  // A Wistia URL is accepted where a media id is expected, the way every other media here accepts a `src`.
  const { mediaId, ...options } = source ?? {};
  const resolved = mediaId ?? (src ? parseWistiaMediaId(src) : null);
  // A `wtime` is a start position rather than a live playhead, and it belongs to the source it was written
  // on — read again for each one, since this component outlives them. Not frozen: an unchanged `src` renders
  // an unchanged attribute, which React leaves alone, so a playing media is never sent back to its start.
  const startTime = src ? parseWistiaStartTime(src) : null;
  // The muted state the player *starts* in, which is this component's to decide rather than the source's.
  const [initialMuted] = useState(() => defaultMuted ?? muted);

  return createElement(WISTIA_PLAYER_TAG, {
    // A new media is a new element. Writing an attribute goes around the normalizer's `source` setter, which
    // is what announces a source change, so the store would hold the last media's duration and title;
    // remounting says it as a detach and an attach. A source that only recolors keeps this id and the player.
    key: resolved,
    ...wistiaAttributes({
      mediaId: resolved ?? '',
      ...wistiaMediaOptions({ autoplay, controls, loop, poster, preload }),
      muted: initialMuted,
      currentTime: startTime,
      // Wistia's own options last, so a source reaches anything the props above do not name.
      ...options,
    }),
    ...rest,
    style: { ...wistiaPlayerStyle(controls), ...style },
    ref: composedRef,
    children,
  });
});

export namespace WistiaVideo {
  export type Props = WistiaVideoProps;
}
