import type { Chapter } from '../../hls/parse-json-chapters';

/**
 * SPF-owned chapters `<track>` selector. Distinct from the subtitle slots' `data-src-track` so each helper family
 * removes only its own slots — and so host-page `<track kind="chapters">` children are never touched.
 */
const SPF_CHAPTERS_TRACK_SELECTOR = 'track[data-src-chapters-track]';

export interface AddChaptersTracksOptions {
  /** The language whose track goes first; `und`, then the first language seen, when no chapter is titled in it. */
  preferredLanguage?: string | undefined;
  /**
   * Where a chapter with no end of its own ends. Absent or non-finite (live), it ends at `Number.MAX_VALUE` — `VTTCue`
   * rejects non-finite times.
   */
  duration?: number | undefined;
}

/**
 * The languages any chapter is titled in, first-seen order, with the one to lead moved to the front. Consumers that
 * read "the" chapters track take the first one on the element (video.js's textTrack feature does), so append order is
 * the whole selection mechanism.
 */
function orderLanguages(chapters: readonly Chapter[], preferredLanguage: string | undefined): string[] {
  const languages: string[] = [];

  for (const chapter of chapters) {
    for (const language of Object.keys(chapter.titles)) {
      if (!languages.includes(language)) languages.push(language);
    }
  }

  const lead = [preferredLanguage, 'und'].find((language) => language !== undefined && languages.includes(language));

  if (lead) {
    languages.splice(languages.indexOf(lead), 1);
    languages.unshift(lead);
  }

  return languages;
}

/**
 * Run `callback` once the `<track>`'s (empty) load has settled. A `<track>` with no `src` still runs the track
 * processing model the moment its mode leaves `disabled`: the empty URL fails the load, `readyState` goes to `ERROR`
 * and `error` fires. Chromium and WebKit drop any cue added before that point, so cues have to wait for it. Same
 * sequence the subtitle slots go through — their cues just happen to arrive later, after a segment fetch.
 */
function onceSettled(el: HTMLTrackElement, callback: () => void): void {
  if (el.readyState >= HTMLTrackElement.LOADED) {
    callback();
    return;
  }

  const settle = (): void => {
    el.removeEventListener('load', settle);
    el.removeEventListener('error', settle);
    callback();
  };

  el.addEventListener('load', settle);
  el.addEventListener('error', settle);
}

/**
 * Project chapters onto `mediaElement` as one hidden `<track kind="chapters">` per title language, each holding a
 * `VTTCue` per chapter titled in that language. The element is the store — there is no chapters state elsewhere — so
 * consumers read `TextTrack.cues` like they would for an authored `<track>`.
 *
 * Slots are `<track>` children (the only spec mechanism that can also remove a text track), tagged
 * `data-src-chapters-track` for `removeAllChaptersTracksFromMedia`. No `src` — a `data:` URL would do, but WebKit
 * refuses one on a `crossorigin` media element — so the cues arrive programmatically: the slot is set `hidden` to let
 * its empty load settle, then filled while `disabled`, then set `hidden` again. That last mode change is what queues
 * the `TextTrackList` `change` observers re-read cues on; a srcless `<track>` never fires `load`. One cue per start
 * time per language; a later chapter repeating a start (two documents merged) is skipped.
 */
export function addChaptersTracksToMedia(
  mediaElement: HTMLMediaElement,
  chapters: readonly Chapter[],
  { preferredLanguage, duration }: AddChaptersTracksOptions = {}
): void {
  const fallbackEnd = duration !== undefined && Number.isFinite(duration) ? duration : Number.MAX_VALUE;

  for (const language of orderLanguages(chapters, preferredLanguage)) {
    const el = document.createElement('track');

    el.kind = 'chapters';
    el.srclang = language;
    el.toggleAttribute('data-src-chapters-track', true);
    mediaElement.appendChild(el);
    el.track.mode = 'hidden';

    onceSettled(el, () => {
      // Removed before the load settled — a source change mid-flight.
      if (el.parentNode !== mediaElement) return;

      const startTimes = new Set<number>();

      el.track.mode = 'disabled';

      for (const chapter of chapters) {
        const title = chapter.titles[language];
        if (title === undefined || startTimes.has(chapter.startTime)) continue;

        startTimes.add(chapter.startTime);
        el.track.addCue(new VTTCue(chapter.startTime, chapter.endTime ?? fallbackEnd, title));
      }

      el.track.mode = 'hidden';
    });
  }
}

/** Remove every SPF-owned chapters `<track>` child from `mediaElement`; subtitle slots and host-page tracks stay. */
export function removeAllChaptersTracksFromMedia(mediaElement: HTMLMediaElement): void {
  const elements = mediaElement.querySelectorAll<HTMLTrackElement>(SPF_CHAPTERS_TRACK_SELECTOR);

  for (const el of elements) {
    el.remove();
  }
}
