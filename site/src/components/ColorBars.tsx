import clsx from 'clsx';

export type ColorBarsVariant = 'extra-short' | 'short' | 'normal';

export interface ColorBarsProps {
  variant?: ColorBarsVariant;
  className?: string;
}

const heightClass: Record<ColorBarsVariant, string> = {
  'extra-short': 'h-20',
  short: 'h-25',
  normal: 'h-52',
};

export default function ColorBars({ variant = 'normal', className }: ColorBarsProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx('relative grid', heightClass[variant], className)}
      style={{ gridTemplateRows: '80fr 60fr 45fr 20fr 10fr' }}
    >
      <div className="bg-bright-yellow dark:bg-gold" />
      <div className="bg-gold dark:bg-orange" />
      <div className="bg-orange dark:bg-red" />
      <div className="bg-red dark:bg-magenta" />
      <div className="bg-magenta dark:bg-magenta-dark" />
    </div>
  );
}
