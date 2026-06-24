import type { MediaFull } from '@videojs/core';
import { useEffect, useRef } from 'react';
import { LOGGED_EVENTS } from './constants';
import { entryColorClass, useMediaLog } from './media-log';
import { Player } from './player';
import { bufferedRatio } from './use-media-state';

/**
 * Renders the live message log. Media events are logged automatically (yellow);
 * the controls push their API calls as actions (orange); getter reads are
 * logged as values (magenta).
 */
export function EventLog() {
  const media = Player.useMedia() as MediaFull | null;
  const { entries, log, clear } = useMediaLog();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!media) return;

    const controller = new AbortController();
    for (const type of LOGGED_EVENTS) {
      const handler =
        type === 'progress'
          ? () => log('event', `progress → ${Math.round(bufferedRatio(media) * 100)}% loaded`)
          : () => log('event', type);
      media.addEventListener(type, handler, { signal: controller.signal });
    }

    // `cuepointchange` is a custom event dispatched by the CuePoints component;
    // its `detail` is the activated cue point.
    (media as unknown as EventTarget).addEventListener(
      'cuepointchange',
      (event) => log('event', `cuepointchange → ${JSON.stringify((event as CustomEvent).detail)}`),
      { signal: controller.signal }
    );

    return () => controller.abort();
  }, [media, log]);

  // Keep the newest entry in view whenever a new one is appended.
  useEffect(() => {
    const el = listRef.current;
    if (el && entries.length) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div className="overflow-hidden border border-faded-black/15 bg-soot text-manila-light dark:border-warm-gray">
      <div className="flex items-center justify-between border-b border-manila-light/10 px-4 py-2.5">
        <span className="font-display text-xs uppercase tracking-wide">Message Log</span>
        <button
          type="button"
          onClick={clear}
          className="rounded-xs px-2 py-0.5 font-mono text-xs text-manila-dark transition-colors hover:bg-manila-light/10 hover:text-manila-light"
        >
          Clear
        </button>
      </div>
      <ol ref={listRef} className="h-48 overflow-y-auto px-4 py-3 font-mono text-xs">
        {entries.length === 0 ? (
          <li className="text-manila-dark">Waiting for media events…</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="flex gap-3 py-0.5">
              <span className="shrink-0 text-manila-dark tabular-nums">{entry.time}</span>
              <span className={`min-w-0 break-words ${entryColorClass(entry.kind)}`}>
                {entry.kind === 'action' ? '▸ ' : ''}
                {entry.label}
              </span>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
