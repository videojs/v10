import clsx from 'clsx';
import debounce from 'just-debounce-it';
import { useEffect, useRef, useState } from 'react';
import ColorBars, { type ColorBarsVariant } from './ColorBars';

const ARM_DWELL_MS = 200;
const RETREAT_DWELL_MS = 300;
const RETREAT_BUFFER_PX = 16;
const SPRING_STIFFNESS = 300;
const SPRING_DAMPING = 22;
const SPRING_MASS = 1;

export interface FooterEasterEggProps {
  variant?: ColorBarsVariant;
  className?: string;
}

export default function FooterEasterEgg({ variant = 'normal', className }: FooterEasterEggProps) {
  const [show, setShow] = useState(false);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const barsWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reduced motion: CSS keeps the bars visible; the controller is unneeded.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let hasScrolled = false;
    let shown = false;
    let armed = true;
    let bottomVisible = false;
    let barsVisible = false;
    let cancelSpring: (() => void) | null = null;

    const armDwell = debounce(() => {
      if (!hasScrolled || !bottomVisible || shown) return;
      shown = true;
      setShow(true);
    }, ARM_DWELL_MS);

    const retreatDwell = debounce(async () => {
      if (!shown || !armed || !barsVisible) return;
      const wrapper = barsWrapperRef.current;
      if (!wrapper) return;
      const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
      const target = Math.max(0, wrapperTop - window.innerHeight - RETREAT_BUFFER_PX);
      // Disarm immediately so the spring can't re-trigger itself; the next
      // real user input flips this back to true.
      armed = false;
      const { animate } = await import('motion');
      const controls = animate(window.scrollY, target, {
        type: 'spring',
        stiffness: SPRING_STIFFNESS,
        damping: SPRING_DAMPING,
        mass: SPRING_MASS,
        onUpdate: (latest) => window.scrollTo(0, latest),
      });
      cancelSpring = () => controls.stop();
    }, RETREAT_DWELL_MS);

    function onUserInput() {
      hasScrolled = true;
      if (cancelSpring) {
        cancelSpring();
        cancelSpring = null;
      }
      armed = true;
    }

    function onScroll() {
      armDwell();
      retreatDwell();
    }

    const passive: AddEventListenerOptions = { passive: true };
    window.addEventListener('wheel', onUserInput, passive);
    window.addEventListener('touchmove', onUserInput, passive);
    window.addEventListener('keydown', onUserInput);
    window.addEventListener('pointerdown', onUserInput, passive);
    window.addEventListener('scroll', onScroll, passive);

    const bottomObserver = new IntersectionObserver(([entry]) => {
      bottomVisible = entry?.isIntersecting ?? false;
      if (bottomVisible) armDwell();
    });
    const topObserver = new IntersectionObserver(([entry]) => {
      barsVisible = entry?.isIntersecting ?? false;
      if (barsVisible) retreatDwell();
    });

    if (bottomSentinelRef.current) {
      bottomObserver.observe(bottomSentinelRef.current);
    }
    if (topSentinelRef.current) {
      topObserver.observe(topSentinelRef.current);
    }

    return () => {
      window.removeEventListener('wheel', onUserInput);
      window.removeEventListener('touchmove', onUserInput);
      window.removeEventListener('keydown', onUserInput);
      window.removeEventListener('pointerdown', onUserInput);
      window.removeEventListener('scroll', onScroll);
      bottomObserver.disconnect();
      topObserver.disconnect();
      armDwell.cancel();
      retreatDwell.cancel();
      cancelSpring?.();
    };
  }, []);

  return (
    <>
      <div ref={topSentinelRef} aria-hidden="true" className="h-px" />
      <div ref={barsWrapperRef} className={clsx(show ? 'block' : 'hidden motion-reduce:block')}>
        <ColorBars variant={variant} className={className} />
      </div>
      <div ref={bottomSentinelRef} aria-hidden="true" className="h-px" />
    </>
  );
}
