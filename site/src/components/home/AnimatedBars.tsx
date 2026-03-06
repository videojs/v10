import type { ReactNode } from 'react';

import { useIntersection } from '@/hooks/useIntersection';

export function AnimatedBars({ children, className }: { children: ReactNode; className?: string }) {
  const [ref, isIntersecting] = useIntersection({ threshold: 0.01, rootMargin: '0px 0px -25% 0px' });

  return (
    <div ref={ref} className={className} data-animate={isIntersecting ? '' : undefined}>
      {children}
    </div>
  );
}
