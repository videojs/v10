import type { ChapterTrack } from '../sources';

export function renderChapters(tracks: readonly ChapterTrack[]): string {
  return tracks
    .map(
      ({ isDefault, label, lang, src }) =>
        `<track kind="chapters" label="${label}" srclang="${lang}" src="${src}"${isDefault ? ' default' : ''} />`
    )
    .join('');
}
