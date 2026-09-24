import { useEffect, useState } from 'react';

export default function useIsHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);
  return isHydrated;
}

/** Wait one frame beyond hydration so URL-backed external stores can publish their client snapshot before UI appears. */
export function useIsHydrationSettled() {
  const isHydrated = useIsHydrated();
  const [isSettled, setIsSettled] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    const frame = requestAnimationFrame(() => setIsSettled(true));

    return () => cancelAnimationFrame(frame);
  }, [isHydrated]);

  return isSettled;
}
