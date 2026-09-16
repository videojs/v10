import { twMerge } from '@/utils/twMerge';

type PillStyle = React.CSSProperties & {
  '--text'?: string;
};

interface PillProps {
  children: React.ReactNode;
  className?: string;
  style?: PillStyle;
  size?: 'default' | 'compact';
}

export default function Pill({ children, className, style, size = 'default' }: PillProps) {
  const pillStyle: PillStyle = { '--text': '0.75rem', ...style };

  return (
    <span
      className={twMerge(
        'inline-flex items-center justify-center rounded-full border border-orange text-(length:--text) font-bold whitespace-nowrap text-orange',
        size === 'compact' ? 'h-5 px-2 sm:h-6 sm:px-3' : 'h-7 px-3 lg:h-10 lg:border-2 lg:px-4 lg:text-h4',
        className
      )}
      style={pillStyle}
    >
      {children}
    </span>
  );
}
