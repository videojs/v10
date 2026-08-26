export type CaptionOrSubtitleKind = 'captions' | 'subtitles';

export interface TextTrackIdentity {
  readonly kind: string;
}

/** Whether a text track is a captions or subtitles track. */
export function isCaptionOrSubtitleTrack(track: { kind: string }): track is { kind: CaptionOrSubtitleKind } {
  return track.kind === 'captions' || track.kind === 'subtitles';
}

/** Find the `<track>` element that owns the given `TextTrack`. */
export function findTrackElement(media: EventTarget, track: TextTrackIdentity): HTMLTrackElement | null {
  // SAFETY: DOM media wrappers may expose the ParentNode query API without inheriting from HTMLElement.
  const root = media as EventTarget & {
    querySelectorAll?: (selectors: string) => Iterable<HTMLTrackElement>;
    shadowRoot?: ShadowRoot | null;
  };

  const elements = [...(root.querySelectorAll?.('track') ?? []), ...(root.shadowRoot?.querySelectorAll('track') ?? [])];

  for (const el of elements) {
    if (el.track === track) return el;
  }

  return null;
}

export function getTextTrackList<Track extends { kind: string; mode: string }>(
  media: { textTracks?: Iterable<Track> },
  filterPred: (textTrack: Track) => boolean
): Track[] {
  if (!media.textTracks) return [];

  return Array.from(media.textTracks).filter(filterPred).sort(sortByKind);
}

function sortByKind(a: { kind: string }, b: { kind: string }): number {
  return a.kind > b.kind ? 1 : a.kind < b.kind ? -1 : 0;
}
