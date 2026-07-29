/**
 * **Own the MediaSource lifecycle for the current source.** When a resolved
 * presentation and a mediaElement are both in scope, creates a MediaSource,
 * attaches it to the element, waits for `'open'`, and publishes it on
 * `context.mediaSource`. On source change or behavior destroy, detaches the
 * MediaSource and clears the slot so the next source starts fresh.
 *
 * Single-positive-state reactor (`'preconditions-unmet'` ↔ `'mediasource-attached'`):
 * state derivation gates on `mediaElement + isResolvedPresentation`. Riding the
 * resolver's resolved/unresolved lifecycle makes direct URL replacement
 * structural — `resolvePresentation` routes the presentation back through
 * unresolved on URL change, which drives this reactor through
 * `'preconditions-unmet'` so the entry's state-exit cleanup detaches the old
 * MediaSource before the new one is built.
 *
 * The entry resolves preconditions in sequence before publishing:
 *
 * 1. **Create + attach** — `createMediaSource` + `attachMediaSource` run
 *    synchronously on entry. The `detach` closure returned by
 *    `attachMediaSource` is captured for state-exit cleanup, so the cleanup
 *    is always bound to its setup even if the wait below is aborted.
 * 2. **Wait for `'open'`** — `waitForMediaSourceOpen` defers until the first
 *    `sourceopen` event (or any readyState transition out of `'closed'`).
 * 3. **Publish on `'open'`** — re-check `readyState === 'open'` after the
 *    await (covers `'ended'` / `'closed'` race) before writing to
 *    `context.mediaSource`. Downstream `setupVideoBufferActors` /
 *    `setupAudioBufferActors` call `addSourceBuffer` directly, which
 *    throws on non-open, so publish-only-when-open is the load-bearing
 *    contract.
 *
 * State-exit cleanup aborts the in-flight wait, detaches the MediaSource,
 * and clears `context.mediaSource`. Order: abort first (prevents a late
 * publish racing the slot clear), then detach, then clear.
 *
 * # Liveness recovery
 *
 * The behavior owns one **live** MediaSource per source identity. The UA can
 * close the attached MediaSource out from under the engine — Safari does on
 * an AirPlay handoff (and never re-selects the MSE source itself; see
 * `setupAirPlay`), and a ManagedMediaSource can be evicted under memory
 * pressure. A closed MediaSource can never reopen, so a behavior-local
 * `sourceclose`-driven flag feeds `deriveState`: the machine cycles out —
 * the state-exit cleanup detaches the corpse, and the ordinary teardown
 * cascade (cleared `context.mediaSource`) stops the rest of the MSE
 * pipeline — then back in with a fresh MediaSource for the *same* source.
 * Cause-agnostic. Two rules shape the cycle:
 *
 * - **Rebuild waits out a remote-playback session.** While a recovery is
 *   pending and `state.remotePlaybackActive` holds, `deriveState` keeps the
 *   machine detached-and-idle; the session's (settled) falling edge
 *   re-derives into the fresh attach — re-attaching runs `element.load()`,
 *   which would re-run resource selection under the live receiver. (The
 *   exit itself is safe mid-session: detach skips its `load()` reset for a
 *   UA-closed MediaSource — see `attachMediaSource`.)
 * - **Playback snapshot on re-entry.** Because recovery detaches without
 *   resetting the element, the element itself carries the restore state:
 *   frozen `currentTime`/`paused` after an eviction, the receiver-mirrored
 *   values through an AirPlay session. Recovery re-entries (and only they)
 *   read `element.currentTime → state.startPosition` and
 *   `!element.paused → state.resumePlayback` synchronously *before* the
 *   fresh attach's `load()` resets the element (the load algorithm forces
 *   `paused = true`), so `applyStartPosition` resumes the rebuilt source
 *   where playback left off, playing when it was playing — and the one-shot
 *   commands are never live while a session still owns the element.
 *   Source-identity exits skip the snapshot.
 *
 * Sole writer of `context.mediaSource`; other MSE behaviors
 * (`setupVideoBufferActors`, `setupAudioBufferActors`,
 * `updateMediaSourceDuration`, `endOfStream`, `loadVideoSegments`) only
 * read.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, signal } from '../../../core/signals/primitives';
import { attachMediaSource, createMediaSource, waitForMediaSourceOpen } from '../../../media/dom/mse/mediasource-setup';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';

/**
 * State shape required for MediaSource setup.
 */
export interface MediaSourceState {
  presentation?: MaybeResolvedPresentation;
  /**
   * One-shot start-position command (see `apply-start-position.ts`).
   * Written here only on **recovery exits** — when the owned MediaSource was
   * closed by the UA — so the rebuilt source resumes at the element's last
   * position. Multi-writer with external consumers (adapter-driven resume):
   * both are one-shot commands into the same slot, resolved by the single
   * consumer `applyStartPosition`.
   */
  startPosition?: number;
  /**
   * One-shot companion to `startPosition` (see `apply-start-position.ts`).
   * Written on recovery exits: `true` when the element was playing at
   * snapshot time, so the rebuilt source resumes playing — detach's `load()`
   * forces `paused = true`, losing the state otherwise.
   */
  resumePlayback?: boolean;
  /**
   * A remote-playback session (AirPlay wireless target) currently owns
   * presentation. Written by `setupAirPlay`; read here to defer the
   * post-close rebuild until the session ends — re-attaching would `load()`
   * under the receiver.
   */
  remotePlaybackActive?: boolean;
}

/**
 * Context shape for MediaSource setup.
 */
export interface MediaSourceContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
}

type MediaSourceFsmState = 'preconditions-unmet' | 'mediasource-attached';

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaElement: HTMLMediaElement | undefined,
  mediaSourceClosed: boolean,
  rebuildHeldBySession: boolean
): MediaSourceFsmState {
  if (!mediaElement || !isResolvedPresentation(presentation)) return 'preconditions-unmet';
  // The UA closed the owned MediaSource (AirPlay handoff, MMS eviction). A
  // closed MediaSource can never reopen — cycle out so the state-exit
  // cleanup detaches it.
  if (mediaSourceClosed) return 'preconditions-unmet';
  // A recovery rebuild waits out a live remote-playback session — attaching
  // runs `load()`, which would re-run resource selection under the
  // receiver. The session's (settled) falling edge re-derives into the
  // fresh attach.
  if (rebuildHeldBySession) return 'preconditions-unmet';
  return 'mediasource-attached';
}

function setupMediaSourceSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<MediaSourceState['presentation']>;
    startPosition: Signal<MediaSourceState['startPosition']>;
    resumePlayback: Signal<MediaSourceState['resumePlayback']>;
    remotePlaybackActive: ReadonlySignal<MediaSourceState['remotePlaybackActive']>;
  };
  context: {
    mediaElement: ReadonlySignal<MediaSourceContext['mediaElement']>;
    mediaSource: Signal<MediaSourceContext['mediaSource']>;
  };
}): Reactor<MediaSourceFsmState | 'destroying' | 'destroyed'> {
  // Behavior-local liveness flag for the currently-owned MediaSource. Set by
  // the entry's `sourceclose` listener; reset by the state-exit cleanup so
  // the machine immediately re-derives.
  const mediaSourceClosed = signal(false);

  // Breadcrumb from a recovery exit to the recovery re-entry: the element
  // still carries the playback state (detach skips its reset for a UA-closed
  // MS), and the entry snapshots it before the fresh attach wipes it. Also
  // holds the rebuild out (with `remotePlaybackActive`) while a session owns
  // the element — see `deriveState`.
  const recoveryPending = signal(false);

  const derivedStateSignal = computed(() =>
    deriveState(
      state.presentation.get(),
      context.mediaElement.get(),
      mediaSourceClosed.get(),
      recoveryPending.get() && !!state.remotePlaybackActive.get()
    )
  );

  return createMachineReactor<MediaSourceFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'mediasource-attached': {
        // entry body is auto-untracked. deriveState handles source resets via
        // the resolver's resolved/unresolved transitions; this entry creates
        // and attaches the MediaSource, awaits `'open'`, publishes on
        // context, and binds detach + slot clear to state exit + destroy.
        entry: () => {
          const mediaElement = context.mediaElement.get()!;
          const controller = new AbortController();

          if (peek(recoveryPending)) {
            // Recovery re-entry: the element still carries where playback
            // was (frozen after an eviction, receiver-mirrored through an
            // AirPlay session). Snapshot it into the one-shot restore
            // commands NOW — the attach below `load()`s, resetting the
            // element (and forcing `paused = true`). Writing and resetting
            // in the same synchronous entry means `applyStartPosition` can
            // only ever see these commands against the rebuilt source.
            recoveryPending.set(false);
            state.startPosition.set(mediaElement.currentTime);
            state.resumePlayback.set(!mediaElement.paused);
          }

          const mediaSource = createMediaSource({ preferManaged: true });
          // Sync attach: the returned `detach` closes over the element +
          // object-URL captured at this moment, so state-exit cleanup tears
          // down exactly this attachment regardless of how the wait below
          // resolves.
          const { detach } = attachMediaSource(mediaSource, mediaElement);

          // Liveness: the UA closing this MediaSource (AirPlay handoff, MMS
          // eviction) drives the recovery re-derive above.
          mediaSource.addEventListener('sourceclose', () => mediaSourceClosed.set(true), {
            signal: controller.signal,
          });

          const publishWhenOpen = async () => {
            await waitForMediaSourceOpen(mediaSource, controller.signal);
            if (controller.signal.aborted) return;
            // `waitForMediaSourceOpen` resolves on any readyState transition
            // out of `'closed'`; if we landed in `'ended'` / `'closed'`
            // instead of `'open'`, the attach window is gone and we leave
            // the slot unpublished. The session is dead within this source
            // either way — publishing wouldn't help because
            // `setupVideoBufferActors` / `setupAudioBufferActors` calls
            // `addSourceBuffer` which throws on non-open. The next
            // source-reset re-enters this state with a fresh MediaSource
            // and recovers. Warn so the case is at least diagnosable; in
            // practice it requires the MediaSource to close/end before its
            // very first `sourceopen`, which a freshly attached MS
            // shouldn't do.
            if (mediaSource.readyState !== 'open') {
              console.warn(
                `[setupMediaSource] MediaSource transitioned to '${mediaSource.readyState}' before first 'sourceopen' — slot left unpublished; recoverable on next source reset.`
              );
              return;
            }
            context.mediaSource.set(mediaSource);
          };

          publishWhenOpen().catch((err) => console.error('[setupMediaSource] failed to publish MediaSource:', err));

          return () => {
            // Order matters: abort the wait first so a late publish can't
            // race the slot clear; then detach (a no-reset detach for a
            // UA-closed MS — the element keeps carrying the playback state
            // for the re-entry snapshot); then clear the slot so the
            // ordinary teardown cascade stops the downstream MSE pipeline.
            // Recovery exits leave the breadcrumb for the re-entry snapshot
            // before resetting the liveness flag — the re-derive then either
            // rebuilds immediately (eviction) or waits out the session (see
            // `deriveState`).
            controller.abort();
            detach();
            context.mediaSource.set(undefined);
            if (peek(mediaSourceClosed)) {
              recoveryPending.set(true);
              mediaSourceClosed.set(false);
            }
          };
        },
      },
    },
  });
}

export const setupMediaSource = defineBehavior({
  stateKeys: ['presentation', 'startPosition', 'resumePlayback', 'remotePlaybackActive'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: setupMediaSourceSetup,
});
