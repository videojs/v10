/** Find the `<track>` element that owns the given `TextTrack`. */
export function findTrackElement(media: HTMLMediaElement, track: TextTrack): HTMLTrackElement | null {
  for (const el of media.querySelectorAll('track')) {
    if (el.track === track) return el;
  }
  return null;
}

export function getSubtitlesTracks(media: HTMLMediaElement): TextTrack[] {
  return getTextTracksList(media, isSubtitleTrack).sort(sortByTextTrackKind);
}

export function getTextTracksList(
  media: HTMLMediaElement,
  filterPredOrObj: ((textTrack: TextTrack) => boolean) | TextTrack = alwaysTrue
): TextTrack[] {
  if (!media?.textTracks) return [];

  const filterPred = typeof filterPredOrObj === 'function' ? filterPredOrObj : textTrackObjAsPred(filterPredOrObj);

  return (Array.from(media.textTracks) as TextTrack[]).filter(filterPred);
}

export function textTrackObjAsPred(filterObj: any): (textTrack: TextTrack) => boolean {
  const preds = Object.entries(filterObj).map(([key, value]) => {
    // Translate each key/value pair into a single predicate
    return isMatchingPropOf(key, value);
  });

  // Return a predicate function that takes the array of single key/value pair predicates and asserts that *every* pred in the array is true of the (TextTrack-like) object
  return (textTrack) => preds.every((pred) => pred(textTrack));
}

export function isMatchingPropOf(key: string | number, value: any): (candidate: TextTrack) => boolean {
  return function matchProp(candidate): boolean {
    return (candidate as unknown as Record<string | number, unknown>)[key] === value;
  };
}

function isSubtitleTrack(textTrack: TextTrack): boolean {
  return ['subtitles', 'captions'].includes(textTrack.kind);
}

function sortByTextTrackKind(a: TextTrack, b: TextTrack): number {
  return a.kind >= b.kind ? 1 : -1;
}

function alwaysTrue(): boolean {
  return true;
}
