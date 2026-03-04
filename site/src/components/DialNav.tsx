import { useRef, useState } from 'react';
import Dial from '@/components/icons/dial.svg?react';

type Link = { href: string; label: string; angle: number };

export interface DialNavProps {
  left: [Link, Link];
  right: [Link, Link];
}

const TRANSITION_MS = 450;

const linkClass =
  'flex rounded-xs min-w-44 items-center gap-2 px-6 py-3 text-display-h5 font-display-compact font-bold uppercase text-faded-black dark:text-light-manila';

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
            className={`${linkClass} justify-end pr-15 -mr-12 bg-50-manila dark:bg-black`}
          >
            {link.label}
            <span
              className="w-2.5 h-2.5 rounded-full border border-faded-black dark:border-light-manila"
              style={dotStyle(link.href)}
            />
          </a>
        ))}
      </div>

      <a
        key={left[0].href}
        href={left[0].href}
        onClick={(e) => handleClick(e, left[0])}
        className="w-20 h-20 md:w-24 md:h-24 shrink-0 relative z-10 text-light-manila dark:text-faded-black"
      >
        <Dial
          style={needleStyle}
          className="outline-8 rounded-full outline-dark-manila dark:outline-faded-black"
          width={'100%'}
          height={'auto'}
        />
      </a>

      <div className="flex flex-col gap-2">
        {right.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleClick(e, link)}
            className={`${linkClass} pl-15 -ml-12 bg-50-manila dark:bg-black`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-faded-black dark:border-light-manila"
              style={dotStyle(link.href)}
            />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
