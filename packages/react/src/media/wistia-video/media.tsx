'use client';

import type { WistiaMediaProps, WistiaPlayer, WistiaSource } from '@videojs/media/dom/wistia';
// Importing this entry is what registers `<wistia-player>`: it is where `@wistia/wistia-player` is imported,
// so the tag this renders cannot outrun the definition that makes it a player.
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
 * than a player of its own making. `@videojs/media/dom/wistia` is what registers it — statically, so
 * the element React hands this component's ref is already upgraded and already a Wistia player. Wistia's own
 * React wrapper defines it from an effect instead, which is a tick too late: the store reads a media once,
 * as it attaches, and a bare `HTMLElement` is a media that cannot seek, buffer, or name a source.
 *
 * The translation is one layer thin. `source` carries Wistia's own options — `mediaId`, `playerColor`,
 * `qualityMin`, and the rest — straight through, so anything the player understands stays reachable without
 * this component knowing about it. What it does know about is the handful a media names differently: `src`
 * for the media id, `loop` for `endVideoBehavior`, `defaultMuted` for the muted state to start in, and
 * `controls` for the group of switches Wistia hides its chrome behind.
 *
 * The element itself is what the player store attaches to, normalized in place, so the ref hands back one
 * object that is both Wistia's player and this project's media.
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
      if (!element) {
        setMedia?.(null);
        return;
      }
      // No cast: this is where Wistia's real class is held to the contract the normalizer describes.
      normalizeWistiaPlayer(element);
      setMedia?.(element as never);
    },
    [setMedia]
  );
  const composedRef = useComposedRefs(attachRef, ref);

  // A Wistia URL is accepted where a media id is expected, the way every other media here accepts a `src`.
  const { mediaId, ...options } = source ?? {};
  const resolved = mediaId ?? (src ? parseWistiaMediaId(src) : null);
  // A `wtime` in the URL is the one thing the id does not carry over, and it is a start position rather
  // than a live playhead, so it is read once from the source this component opened with.
  const [startTime] = useState(() => (src ? parseWistiaStartTime(src) : null));
  // The muted state the player *starts* in. Sent on every render it would fight the viewer: unmuting through
  // the skin drives the element, and the next parent render would put the mute straight back.
  const [initialMuted] = useState(() => defaultMuted ?? muted);

  return createElement(WISTIA_PLAYER_TAG, {
    // A new media is a new element. What announces a source change on the element is the normalizer's
    // `source` setter — `emptied`, then `sourcechange`, and the metadata latch reset — and writing an
    // attribute goes around it, so the player would swap media with nothing saying so and the store would
    // hold the last one's duration and title. Remounting says it the other way, as a detach and an attach.
    // Wistia's own React wrapper keys its element too; a source that only recolors the player keeps this id
    // and so keeps the player.
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
