'use client';

import type { WistiaMediaProps, WistiaSource } from '@videojs/media/dom/wistia';
import {
  normalizeWistiaPlayer,
  parseWistiaMediaId,
  wistiaControlProps,
  wistiaPlayerDefaultOptions,
  wistiaPlayerStyle,
} from '@videojs/media/dom/wistia';
import type { WistiaPlayerElement, WistiaPlayerProps } from '@wistia/wistia-player-react';
import { WistiaPlayer } from '@wistia/wistia-player-react';
import type { ForwardRefExoticComponent, RefAttributes, RefCallback } from 'react';
import { forwardRef, useCallback } from 'react';
import { useMediaAttach } from '../../player/context';
import { useComposedRefs } from '../../utils/use-composed-refs';

export interface WistiaVideoProps
  extends Partial<Omit<WistiaMediaProps, 'source'>>,
    Omit<WistiaPlayerProps, 'endVideoBehavior' | 'mediaId' | 'muted' | 'poster' | 'preload' | 'ref'> {
  /** Wistia's own options, `mediaId` among them: everything the player understands that a media does not. */
  source?: WistiaSource | null;
}

/**
 * Wistia ships a React component of its own, so this wraps it rather than rendering the element: the same
 * player, with the props a media is expected to have.
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
export const WistiaVideo: ForwardRefExoticComponent<WistiaVideoProps & RefAttributes<WistiaPlayerElement>> = forwardRef<
  WistiaPlayerElement,
  WistiaVideoProps
>(function WistiaVideo(
  {
    autoplay,
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

  const attachRef = useCallback<RefCallback<WistiaPlayerElement>>(
    (element) => {
      if (element) normalizeWistiaPlayer(element as never);
      setMedia?.(element as never);
    },
    [setMedia]
  );
  const composedRef = useComposedRefs(attachRef, ref);

  // A Wistia URL is accepted where a media id is expected, the way every other media here accepts a `src`.
  const { mediaId, ...options } = source ?? {};
  const resolved = mediaId ?? (src ? parseWistiaMediaId(src) : null);
  // An empty `preload` is what a bare `preload` attribute means; Wistia accepts only the three words.
  const resolvedPreload = preload || 'metadata';

  return (
    <WistiaPlayer
      // Required by the component, and the one prop with nothing sensible to fall back to.
      mediaId={resolved ?? ''}
      {...wistiaPlayerDefaultOptions}
      {...(autoplay !== undefined && { autoplay })}
      {...(loop !== undefined && { endVideoBehavior: loop ? 'loop' : 'default' })}
      // The state the player starts in; `muted` after that is the viewer's, driven through the element.
      {...((defaultMuted ?? muted) !== undefined && { muted: defaultMuted ?? muted })}
      {...(poster !== undefined && { poster })}
      {...(preload !== undefined && { preload: resolvedPreload })}
      {...wistiaControlProps(controls)}
      style={{ ...wistiaPlayerStyle(controls), ...style }}
      // Wistia's own options last, so a source reaches anything the props above do not name.
      {...options}
      {...rest}
      ref={composedRef}
    />
  );
});

export namespace WistiaVideo {
  export type Props = WistiaVideoProps;
}
