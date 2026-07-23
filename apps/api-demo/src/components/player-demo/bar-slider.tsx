import { type ComponentProps, useLayoutEffect, useRef, useState } from 'react';

// Roughly one bar every N pixels; the exact count is derived from the width.
const TARGET_SPACING = 4;
const MAX_BARS = 120;

/**
 * A range slider styled as a row of short vertical bars (a "tally bar"). Bars up
 * to the current value are orange; the rest are muted. Hovering raises the bar
 * under the pointer and its neighbors. A transparent native `<input type="range">`
 * sits on top for interaction and accessibility — pointer events bubble to the
 * container so we can still track which bar is hovered.
 */
export function BarSlider({ className, buffered, ...props }: ComponentProps<'input'> & { buffered?: number }) {
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 100);
  const value = Number(props.value ?? 0);
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const bufferedRatio =
    buffered !== undefined && max > min ? Math.min(1, Math.max(0, (buffered - min) / (max - min))) : 0;

  const trackRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setCount(Math.min(MAX_BARS, Math.max(8, Math.round(el.clientWidth / TARGET_SPACING))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const filled = Math.round(ratio * count);
  const loaded = Math.round(bufferedRatio * count);

  const scaleFor = (index: number): number => {
    if (hovered === null) return 0.8;
    const dist = Math.abs(index - hovered);
    if (dist === 0) return 1;
    if (dist === 1) return 0.92;
    if (dist === 2) return 0.86;
    return 0.8;
  };

  return (
    <div
      ref={trackRef}
      className={`group relative flex h-6 w-full justify-between ${props.disabled ? 'opacity-50' : ''} ${className ?? ''}`}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || count === 0) return;
        const index = Math.round(((event.clientX - rect.left) / rect.width) * (count - 1));
        setHovered(Math.min(count - 1, Math.max(0, index)));
      }}
      onPointerLeave={() => setHovered(null)}
    >
      {Array.from({ length: count }, (_, index) => {
        const color =
          index < filled
            ? 'bg-orange'
            : index < loaded
              ? 'bg-faded-black/60 dark:bg-manila-light/65'
              : 'bg-faded-black/35 dark:bg-manila-light/40';
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: bars are a fixed positional list
            key={index}
            aria-hidden="true"
            className={`h-full w-px origin-center transition-transform duration-150 ease-out ${color}`}
            style={{ transform: `scaleY(${scaleFor(index)})` }}
          />
        );
      })}
      <input
        type="range"
        {...props}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}
