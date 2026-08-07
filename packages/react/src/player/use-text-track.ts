'use client';

import { createTextTrackSelector, type MediaTextTrackDetails } from '@videojs/core/dom';
import { useMemo } from 'react';

import { useOptionalPlayer } from './context';

/**
 * Get the first text track matching a kind and optional label.
 *
 * Re-renders when the selected track, its cues, or its source changes.
 *
 * @param kind - Text track kind to match.
 * @param label - Optional label to distinguish tracks with the same kind.
 */
export function useTextTrack<Kind extends string>(kind: Kind, label?: string): MediaTextTrackDetails<Kind> | undefined {
  const selector = useMemo(() => createTextTrackSelector(kind, label), [kind, label]);
  return useOptionalPlayer(selector);
}
