import type { PartiallyResolvedTextTrack, TextTrack } from '../../types';

/**
 * Allocate a text-track slot on `mediaElement` by creating and appending a
 * `<track>` child whose attributes mirror the model track. Returns the
 * element so callers can `.remove()` it to evict the slot — the spec has no
 * `removeTextTrack` API, so removing the `<track>` element is the only way
 * to take a slot back out of `mediaElement.textTracks`.
 *
 * Marks the element with `data-src-track` so external code (devtools, host
 * page integrations) can distinguish SPF-owned slots from `<track>` children
 * the host page added directly.
 */
export function addTextTrackSlot(
  mediaElement: HTMLMediaElement,
  modelTrack: PartiallyResolvedTextTrack | TextTrack
): HTMLTrackElement {
  const el = document.createElement('track');
  el.id = modelTrack.id;
  el.kind = modelTrack.kind;
  el.label = modelTrack.label;
  el.toggleAttribute('data-src-track', true);
  if (modelTrack.language) el.srclang = modelTrack.language;
  if (modelTrack.default) el.default = true;
  mediaElement.appendChild(el);
  return el;
}

/**
 * Apply a selection to a `TextTrackList` by setting each subtitle/caption
 * track's `mode` to `'showing'` if its `id` matches `selectedId` and
 * `'disabled'` otherwise. Tracks of other kinds (chapters, metadata,
 * descriptions) are left untouched — they may be owned by the host page.
 */
export function syncTextTrackModes(textTracks: TextTrackList, selectedId: string | undefined): void {
  for (let i = 0; i < textTracks.length; i++) {
    const track = textTracks[i]!;
    if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;
    track.mode = track.id === selectedId ? 'showing' : 'disabled';
  }
}
