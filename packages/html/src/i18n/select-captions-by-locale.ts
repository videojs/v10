import type { AnyPlayerStore } from '@videojs/core/dom';
import type { Locale } from '@videojs/core/i18n';
import { localeLookupChain } from '@videojs/core/i18n';

function normalizeLangTag(tag: string): string {
  return tag.trim().replace(/_/g, '-').toLowerCase();
}

/**
 * Picks caption/subtitle tracks matching {@link localeLookupChain} and shows the best match.
 * Other subtitle/caption tracks are disabled. No-op when there is no match (preserves user state).
 */
export function selectCaptionsByLocale(store: AnyPlayerStore | undefined, locale: Locale): void {
  const media = store?.target?.media;
  if (!media || !('textTracks' in media)) return;

  const el = media as HTMLMediaElement;
  const candidates = [...el.textTracks].filter((t) => t.kind === 'captions' || t.kind === 'subtitles');
  if (!candidates.length) return;

  const chain = localeLookupChain(locale).map(normalizeLangTag);
  let picked: TextTrack | undefined;
  for (const tag of chain) {
    picked = candidates.find((t) => {
      const lang = normalizeLangTag(t.language ?? '');
      return lang === tag || lang.startsWith(`${tag}-`) || tag.startsWith(`${lang}-`);
    });
    if (picked) break;
  }
  if (!picked) return;

  for (const t of candidates) {
    t.mode = t === picked ? 'showing' : 'disabled';
  }
}
