import clsx from 'clsx';

import { twMerge } from '@/utils/twMerge';

interface BetaPillProps {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  /** Replaces the default "v10 rc" text, e.g. with the documented package version. */
  label?: string;
}

/** Quiet version tag that sits beside the logo: a small tinted chip in monospace instead of an outlined pill. */
export default function BetaPill({ className, style, compact, label }: BetaPillProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-md corner-squircle bg-orange/12 font-mono text-orange whitespace-nowrap select-none',
          'dark:bg-orange/15',
          compact ? 'h-5 px-1.5 text-p4' : 'h-6 px-2 text-p4 sm:text-p3'
        ),
        className
      )}
      style={style}
    >
      {label ?? (
        <>
          v10<span className="hidden whitespace-pre uppercase sm:inline"> rc</span>
        </>
      )}
    </span>
  );
}
