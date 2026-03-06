/** Find the `<track>` element that owns the given `TextTrack`. */
export function findTrackElement(media: HTMLMediaElement, track: TextTrack): HTMLTrackElement | null {
  for (const el of media.querySelectorAll('track')) {
    if (el.track === track) return el;
  }
  return null;
}

export function getSubtitlesTracks(media: HTMLMediaElement): TextTrack[] {
  if (!media?.textTracks) return [];
  return (Array.from(media.textTracks) as TextTrack[]).filter(isSubtitleTrack).sort(sortByTextTrackKind);
}

export function getTextTrackList(media: HTMLMediaElement, filterPred: (textTrack: TextTrack) => boolean): TextTrack[] {
  if (!media?.textTracks) return [];
  return (Array.from(media.textTracks) as TextTrack[]).filter(filterPred);
}

function isSubtitleTrack(textTrack: TextTrack): boolean {
  return textTrack.kind === 'subtitles' || textTrack.kind === 'captions';
}

function sortByTextTrackKind(a: TextTrack, b: TextTrack): number {
  return a.kind >= b.kind ? 1 : -1;
}
