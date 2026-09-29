import { useEffect, useRef, useState } from 'react';

import { usePlayer } from './VolumePersistence';

export default function CaptionsPersistence() {
  const store = usePlayer();
  const { tracks, canPlay } = usePlayer((s) => ({ tracks: s.textTrackList, canPlay: s.canPlay }));
  const [saved] = useState(() => {
    try {
      return localStorage.getItem('player:captions');
    } catch {
      return null;
    }
  });
  const restored = useRef(false);
  const lastSelection = useRef<string | null>(null);

  useEffect(() => {
    const subtitles = tracks.filter((t) => t.kind === 'captions' || t.kind === 'subtitles');
    if (!subtitles.length) return;

    const showing = subtitles.find((t) => t.mode === 'showing');
    const selection = showing ? showing.language : 'off';

    // Restore phase: assert the saved preference until the media can play.
    if (!restored.current) {
      const desired = saved === 'off' ? undefined : subtitles.find((t) => t.language === saved);

      if (saved && (desired || saved === 'off')) {
        const applied = subtitles.every((t) => (t.mode === 'showing') === (t.id === desired?.id));

        if (!applied) {
          store.selectSubtitlesTrack(desired?.id ?? 'off');
          return;
        }
      }

      if (!canPlay) return;

      restored.current = true;
      lastSelection.current = selection;
      return;
    }

    // Save only later selection changes, preserving an unmatched preference.
    if (selection === lastSelection.current) return;

    lastSelection.current = selection;

    try {
      localStorage.setItem('player:captions', selection);
    } catch {
      // Continue without persistence when storage is blocked.
    }
  }, [store, tracks, canPlay, saved]);

  return null;
}
