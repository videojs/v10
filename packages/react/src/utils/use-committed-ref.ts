import { useInsertionEffect, useRef } from 'react';

/**
 * Keep an internal ref whose updates become visible only when a render commits.
 * The initial value remains synchronously available to lazy initializers.
 */
export function useCommittedRef<Value>(value: Value): Readonly<{ current: Value }> {
  const ref = useRef(value);

  useInsertionEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
