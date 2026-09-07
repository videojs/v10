import clsx from 'clsx';

import { twMerge } from '@/utils/twMerge';

interface BetaPillProps {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  /** Replaces the default "v10 rc" text, e.g. with the documented package version. */
  label?: string;
}

/** Quiet version tag that sits beside the logo: a neutral chip that reads as metadata rather than a call to action. */
export default function BetaPill({ className, style, compact, label }: BetaPillProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-md corner-squircle bg-surface-raised ring-1 ring-line font-medium text-muted whitespace-nowrap select-none',
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
