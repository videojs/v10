import { isUndefined } from '@videojs/utils/predicate';
import { useRef } from 'react';

function hasKey<Owner extends object>(owner: Owner, key: PropertyKey): key is keyof Owner {
  return key in owner;
}

export function useSyncProps<Props extends object, Rest extends object, Target extends Props = Props>(
  target: Target,
  props: Partial<Props> & Rest,
  defaults: Props
): Omit<Rest, keyof Props> {
  const syncTarget: Props = target;
  const rest = /* SAFETY: Properties outside the media contract are copied into this object below. */ {} as Omit<
    Rest,
    keyof Props
  >;
  const synced = new Set<keyof Props & string>();
  const prevSyncedRef = useRef<Set<keyof Props & string> | null>(null);

  const sync = <Key extends keyof Props>(key: Key, value: Props[Key]) => {
    if (syncTarget[key] !== value) syncTarget[key] = value;
  };

  // Reset props the consumer stopped passing (or passed as `undefined`) back to
  // their defaults before applying the current ones, so a reset can never wipe a
  // value another prop derives in the same render (e.g. `source` deriving `src`).
  // Mirrors react-dom removing absent attributes.
  for (const key of prevSyncedRef.current ?? []) {
    if (isUndefined(props[key])) sync(key, defaults[key]);
  }

  for (const key in props) {
    if (hasKey(defaults, key)) {
      const value = props[key];
      if (isUndefined(value)) continue;
      synced.add(key);
      sync(
        key,
        /* SAFETY: A present Partial<Props> value preserves the corresponding Props property contract. */ value as typeof value &
          Props[typeof key]
      );
    } else {
      Object.assign(rest, {
        [key]: props[/* SAFETY: A for-in key comes from props. */ key as keyof typeof props],
      });
    }
  }

  prevSyncedRef.current = synced;

  return rest;
}
