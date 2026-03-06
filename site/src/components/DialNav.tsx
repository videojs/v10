import clsx from 'clsx';
import { useRef, useState } from 'react';
import DialInner from '@/components/icons/dial-inner.svg?react';
import DialOuter from '@/components/icons/dial-outer.svg?react';

type Link = { href: string; label: string; angle: number };

export interface DialNavProps {
  left: [Link, Link];
  right: [Link, Link];
}

const TRANSITION_MS = 450;

export default function DialNav({ left, right }: DialNavProps) {
  const [activeAngle, setActiveAngle] = useState<number | null>(null);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(e: React.MouseEvent, link: Link) {
    e.preventDefault();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveAngle(link.angle);
    setActiveHref(link.href);
    timeoutRef.current = setTimeout(() => {
      window.location.href = link.href;
    }, TRANSITION_MS);
  }

  function dotStyle(href: string): React.CSSProperties {
    const active = activeHref === href;
    return {
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
      backgroundColor: active ? 'var(--color-orange)' : '',
    };
  }

  // design
  const needleStyle: React.CSSProperties = {
    transformBox: 'view-box',
    transformOrigin: '50% 50%',
    transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    transform: activeAngle !== null ? `rotate(${activeAngle}deg)` : undefined,
  };

  return (
    <div className="flex items-center gap-0">
      {/* Left links */}
      <div className="flex flex-col gap-2">
        {left.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleClick(e, link)}
            className={clsx(
              'flex rounded-xs min-w-44 items-center gap-2 px-6 py-6 text-h5 font-display-compact font-bold uppercase text-faded-black dark:text-manila-light',
              'justify-end pr-15 -mr-12 bg-manila-50 dark:bg-black'
            )}
          >
            {link.label}
            <span
              className="w-2.5 h-2.5 rounded-full border border-faded-black dark:border-manila-light"
              style={dotStyle(link.href)}
            />
          </a>
        ))}
      </div>

      <a
        key={left[0].href}
        href={left[0].href}
        onClick={(e) => handleClick(e, left[0])}
        className="w-20 h-20 md:w-32 md:h-32 shrink-0 relative z-10 text-manila-light dark:text-faded-black"
      >
        <DialOuter
          className="outline-8 rounded-full outline-manila-dark dark:outline-faded-black"
          width={'100%'}
          height={'auto'}
        />
        <DialInner style={needleStyle} className="absolute inset-0" width={'100%'} height={'auto'} />
      </a>

      <div className="flex flex-col gap-2">
        {right.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleClick(e, link)}
            className={clsx(
              'flex rounded-xs min-w-44 items-center gap-2 px-6 py-6 text-h5 font-display-compact font-bold uppercase text-faded-black dark:text-manila-light',
              'pl-15 -ml-12 bg-manila-50 dark:bg-black'
            )}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-faded-black dark:border-manila-light"
              style={dotStyle(link.href)}
            />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
