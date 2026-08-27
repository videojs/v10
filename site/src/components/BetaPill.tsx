import { twMerge } from '@/utils/twMerge';

interface BetaPillProps {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  /** Replaces the default "v10 beta" text, e.g. with the documented package version. */
  label?: string;
}

export default function BetaPill({ className, style, compact, label }: BetaPillProps) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center justify-center rounded-full border border-orange text-(length:--text) font-bold text-orange',
        compact
          ? 'h-5 px-2 font-display-compact sm:h-6 sm:px-3 sm:font-display'
          : 'h-7 px-3 font-display lg:h-10 lg:border-2 lg:px-4 lg:text-h4',
        className
      )}
      style={{ '--text': '0.75rem', ...style } as React.CSSProperties}
    >
      {label ? (
        <span className="whitespace-nowrap">{label}</span>
      ) : compact ? (
        <>
          <span>v10</span>
          <span className="hidden whitespace-pre uppercase sm:inline"> beta</span>
        </>
      ) : (
        <>
          v10<span className="whitespace-pre uppercase"> beta</span>
        </>
      )}
    </span>
  );
}
