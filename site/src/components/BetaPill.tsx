import Pill from '@/components/Pill';
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
    <Pill
      className={twMerge(compact ? 'font-display-compact sm:font-display' : 'font-display', className)}
      size={compact ? 'compact' : 'default'}
      style={style}
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
    </Pill>
  );
}
