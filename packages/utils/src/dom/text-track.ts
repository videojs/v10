/** Find the `<track>` element that owns the given `TextTrack`. */
export function findTrackElement(media: HTMLMediaElement, track: TextTrack): HTMLTrackElement | null {
  for (const el of media.querySelectorAll('track')) {
    if (el.track === track) return el;
  }
  return null;
}
