import { useEffect, useRef, useState } from 'react';

export function useIntersection(options?: IntersectionObserverInit): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  const ref = (node: Element | null) => {
    observerRef.current?.disconnect();

    if (!node || isIntersecting) return;

    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setIsIntersecting(true);
        observerRef.current?.disconnect();
      }
    }, options);

    observerRef.current.observe(node);
  };

  return [ref, isIntersecting];
}
