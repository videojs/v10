import type { ChapterTrack } from '../sources';

export function Chapters({ tracks }: { tracks: readonly ChapterTrack[] }) {
  return tracks.map(({ isDefault, label, lang, src }) => (
    <track key={lang} kind="chapters" label={label} srcLang={lang} src={src} default={isDefault} />
  ));
}
