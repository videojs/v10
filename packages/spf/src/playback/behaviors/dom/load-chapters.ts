/**
 * **Project Apple JSON chapters onto the host media element.** When the resolved presentation carries an
 * `#EXT-X-SESSION-DATA` entry for `com.apple.hls.chapters`, fetch the document it points at, parse it, and add one
 * hidden `<track kind="chapters">` per title language — cues and all — to `mediaElement`. The element is the store:
 * there is no chapters state slot, exactly as subtitle cues live on their DOM tracks and nowhere else. Consumers
 * (video.js's textTrack feature, a host page) read the first chapters track's `cues` the way they would an authored
 * `<track>`.
 *
 * Single-positive-state reactor (`'preconditions-unmet'` ↔ `'loading'`), gated on a media element, a resolved
 * presentation **with a duration**, and at least one chapters entry with a URI. The duration gate is what ends the last
 * chapter when the document leaves it open: `VTTCue` rejects a non-finite end, and a chapters UI can't place a chapter
 * whose end it doesn't know — and for on-demand content the duration lands with the first media playlist, which
 * playback needs anyway. Entry fetches and projects, fire-once; the returned cleanup aborts an in-flight fetch and
 * removes the slots on state exit (source unload, media element change, destroy).
 *
 * Failures are never fatal: a document that won't load or won't parse is warned about and projects nothing. An entry
 * carrying its data inline as `VALUE` is skipped — chapters are a document, not a string. Several entries (one per
 * `LANGUAGE`) are fetched together and merged; the slot helper keeps one cue per start time per language.
 *
 * Slots carry `data-src-chapters-track`, distinct from the subtitle slots' tag, so neither cleanup removes the other's
 * tracks. A `<track kind="chapters">` the host page authored precedes these in `textTracks` (tree order), so a page
 * that supplies its own chapters keeps them. On a Mux source this document is the same one the Mux adapter reads for
 * the asset title; the request is cacheable, and each side stays ignorant of the other.
 */

import { isAbortError } from '@videojs/utils/predicate';

import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal } from '../../../core/signals/primitives';
import {
  addChaptersTracksToMedia,
  removeAllChaptersTracksFromMedia,
} from '../../../media/dom/text/chapters-track-slots';
import { APPLE_HLS_CHAPTERS_DATA_ID, type Chapter, parseHlsJsonChapters } from '../../../media/hls/parse-json-chapters';
import type { TextSelectionConfig } from '../../../media/primitives/select-tracks';
import {
  getSessionData,
  hasPresentationDuration,
  isResolvedPresentation,
  type MaybeResolvedPresentation,
} from '../../../media/types';
import { fetchResolvableText } from '../../../network/fetch';

type LoadChaptersFsmState = 'preconditions-unmet' | 'loading';

/** The chapters track for `preferredSubtitleLanguage` leads, when the document titles chapters in it. */
export type LoadChaptersConfig = Pick<TextSelectionConfig, 'preferredSubtitleLanguage'>;

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaElement: HTMLMediaElement | undefined
): LoadChaptersFsmState {
  if (!mediaElement || !isResolvedPresentation(presentation) || !hasPresentationDuration(presentation)) {
    return 'preconditions-unmet';
  }

  const hasDocument = getSessionData(presentation, APPLE_HLS_CHAPTERS_DATA_ID).some((entry) => entry.uri !== undefined);

  return hasDocument ? 'loading' : 'preconditions-unmet';
}

/** Fetch and parse one chapters document; a failure other than our own abort is warned about and yields nothing. */
async function loadChaptersDocument(uri: string, signal: AbortSignal): Promise<Chapter[]> {
  try {
    const text = await fetchResolvableText({ url: uri }, { signal });

    return parseHlsJsonChapters(JSON.parse(text), uri);
  } catch (error) {
    if (!isAbortError(error)) console.warn(`[loadChapters] Failed to load the chapters document at ${uri}`, error);

    return [];
  }
}

function loadChaptersSetup({
  state,
  context,
  config,
}: {
  state: { presentation: ReadonlySignal<MaybeResolvedPresentation | undefined> };
  context: { mediaElement: ReadonlySignal<HTMLMediaElement | undefined> };
  config: LoadChaptersConfig;
}): Reactor<LoadChaptersFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(state.presentation.get(), context.mediaElement.get()));

  return createMachineReactor<LoadChaptersFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      loading: {
        // Entry is auto-untracked: the presentation object can be rewritten
        // while loading (tracks resolving, a live reload) without re-entering,
        // and the monitor only leaves this state when a precondition drops.
        entry: () => {
          const mediaElement = context.mediaElement.get()!;
          const presentation = state.presentation.get()!;
          const uris = getSessionData(presentation, APPLE_HLS_CHAPTERS_DATA_ID).flatMap((entry) =>
            entry.uri !== undefined ? [entry.uri] : []
          );
          const controller = new AbortController();

          void Promise.all(uris.map((uri) => loadChaptersDocument(uri, controller.signal))).then((documents) => {
            // A document that settled before the abort still must not project
            // onto a media element the state has since left.
            if (controller.signal.aborted) return;

            addChaptersTracksToMedia(mediaElement, documents.flat(), {
              preferredLanguage: config.preferredSubtitleLanguage,
              duration: presentation.duration,
            });
          });

          return () => {
            controller.abort();
            removeAllChaptersTracksFromMedia(mediaElement);
          };
        },
      },
    },
  });
}

export const loadChapters = defineBehavior({
  stateKeys: ['presentation'],
  contextKeys: ['mediaElement'],
  setup: loadChaptersSetup,
});
