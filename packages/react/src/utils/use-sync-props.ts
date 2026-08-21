import { isUndefined } from '@videojs/utils/predicate';
import { useLayoutEffect, useRef } from 'react';

export function useSyncProps<Props extends object, Rest extends Record<string, unknown>>(
  target: Props,
  props: Partial<Props> & Rest,
  defaults: Props
): Omit<Rest, keyof Props> {
  const rest: Record<string, unknown> = {};
  const synced = new Set<string>();
  const prevSyncedRef = useRef<Set<string> | null>(null);
  const entries: [string, unknown][] = [];

  for (const key in props) {
    if (key in defaults) {
      if (isUndefined(props[key])) continue;
      synced.add(key);
      entries.push([key, props[key]]);
    } else {
      rest[key] = props[key];
    }
  }

  useLayoutEffect(() => {
    const sync = (key: string, value: unknown) => {
      if (target[key as keyof Props] !== value) target[key as keyof Props] = value as Props[keyof Props];
    };

    // Reset props the consumer stopped passing (or passed as `undefined`) back
    // to their defaults before applying the current ones, so a reset cannot wipe
    // a value another prop derives in the same commit (for example, `source`
    // deriving `src`). Mirrors react-dom removing absent attributes.
    for (const key of prevSyncedRef.current ?? []) {
      if (!synced.has(key)) {
        sync(key, (defaults as Record<string, unknown>)[key]);
      }
    }

    for (const [key, value] of entries) sync(key, value);

    prevSyncedRef.current = synced;
  });

  return rest as Omit<Rest, keyof Props>;
}
