import { isUndefined } from '@videojs/utils/predicate';
import { useRef } from 'react';

export function useSyncProps<Props extends object, Rest extends Record<string, unknown>>(
  target: Props,
  props: Partial<Props> & Rest,
  defaults: Props
): Omit<Rest, keyof Props> {
  const rest: Record<string, unknown> = {};
  const synced = new Set<string>();
  const prevSyncedRef = useRef<Set<string> | null>(null);

  const sync = (key: string, value: unknown) => {
    if (target[key as keyof Props] !== value) target[key as keyof Props] = value as Props[keyof Props];
  };

  // Reset props the consumer stopped passing back to their defaults before
  // applying the current ones (mirrors react-dom removing absent attributes).
  for (const key of prevSyncedRef.current ?? []) {
    if (!(key in props)) sync(key, (defaults as Record<string, unknown>)[key]);
  }

  for (const key in props) {
    if (key in defaults) {
      synced.add(key);
      sync(key, isUndefined(props[key]) ? (defaults as Record<string, unknown>)[key] : props[key]);
    } else {
      rest[key] = props[key];
    }
  }

  prevSyncedRef.current = synced;

  return rest as Omit<Rest, keyof Props>;
}
