/**
 * Type-level guard on DRM's **droppability**: that a composition can omit the DRM behaviors and carry none of their
 * slots.
 *
 * Why a type test rather than an assertion in a runtime test: the guarantee is about what the composition's inferred
 * state/context shapes contain, which is exactly what `createComposition`'s key-union inference decides. A slot leaking
 * into the DRM-free shape means some always-composed behavior started declaring it — the failure mode this pins, and
 * one no runtime assertion can see.
 *
 * The byte guarantee this protects (91% of DRM's cost recovered, ~248 B residue) rests on the same property: every DRM
 * module is reachable only through `setupMediaKeys` / `exchangeLicenses` and the two DRM-aware config defaults, so a
 * composition omitting them tree-shakes the rest. Keep it that way — see
 * `internal/design/spf/features/drm-support.md`.
 */
import { describe, expectTypeOf, it } from 'vite-plus/test';

import { createComposition } from '../../../../core/composition/create-composition';
import { attachMediaSourceAsSourceElement } from '../../../../media/dom/mse/mediasource-setup';
import { parseMultivariantPlaylist } from '../../../../media/hls/parse-multivariant';
import { collectErrors } from '../../../behaviors/collect-errors';
import { exchangeLicenses } from '../../../behaviors/dom/exchange-licenses';
import { loadVideoSegments } from '../../../behaviors/dom/load-segments';
import { setupMediaKeys } from '../../../behaviors/dom/setup-media-keys';
import { setupMediaSource } from '../../../behaviors/dom/setup-mediasource';
import { resolvePresentation } from '../../../behaviors/resolve-presentation';
import { switchVideoTrack } from '../../../behaviors/track-switching';

// The behaviors every composition carries, split at the one insertion point DRM
// needs — after MSE setup, before the load dispatchers, so the gate is up before
// their first dispatch.
const BASE_PRE = [resolvePresentation, collectErrors, switchVideoTrack, setupMediaSource] as const;
const BASE_POST = [loadVideoSegments] as const;

const config = {
  parsePresentation: parseMultivariantPlaylist,
  attachMediaSource: attachMediaSourceAsSourceElement,
};

describe('DRM as an optional composition', () => {
  it('materializes no DRM slots when the behaviors are omitted', () => {
    const clear = createComposition([...BASE_PRE, ...BASE_POST], { config });

    // @ts-expect-error - the segment-load gate exists only where a writer is composed
    void clear.state.segmentLoadingBlocked;
    // @ts-expect-error - the negotiation outcome exists only where DRM is composed
    void clear.state.negotiatedKeySystem;
    // @ts-expect-error - MediaKeys are `setupMediaKeys`' to publish
    void clear.context.mediaKeys;
  });

  it('materializes them when the behaviors are composed, from the same base', () => {
    // No duplicated behavior list: the DRM composition is the shared base with
    // one splice. `exchangeLicenses` precedes the negotiation it consumes so its
    // cleanup — closing sessions — runs before the detach.
    const drm = createComposition([...BASE_PRE, exchangeLicenses, setupMediaKeys, ...BASE_POST], {
      config: { ...config, drm: {}, keySystems: [] },
    });

    expectTypeOf(drm.state.segmentLoadingBlocked.get()).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(drm.state.negotiatedKeySystem.get()).toEqualTypeOf<string | undefined>();
    expectTypeOf(drm.context.mediaKeys.get()).toEqualTypeOf<MediaKeys | undefined>();
  });
});
