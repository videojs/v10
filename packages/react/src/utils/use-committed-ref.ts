import { useInsertionEffect, useRef } from 'react';

/**
 * Keep a ref whose updates become visible only once the render that produced them commits.
 *
 * Unlike `useLatestRef`, which writes during render, this hook publishes in `useInsertionEffect`. Abandoned and
 * speculative renders therefore never leak their callbacks or props into retained listeners, while the value is already
 * current by the time any layout effect in the tree (including descendants) runs. The initial value stays synchronously
 * available to lazy initializers.
 *
 * @param value - Value the ref should expose after the current render commits.
 */
export function useCommittedRef<Value>(value: Value): Readonly<{ current: Value }> {
  const ref = useRef(value);

  useInsertionEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

export namespace useCommittedRef {
  export type Result<Value> = Readonly<{ current: Value }>;
}
