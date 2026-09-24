import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import ArrowUpRight from '@/assets/icons/arrow-up-right.svg?react';
import Check from '@/assets/icons/check.svg?react';
import { twMerge } from '@/utils/twMerge';
import { useIsHydrationSettled } from '@/utils/useIsHydrated';

export interface CardRadioOption<T = string> {
  value: T;
  label: string;
  description?: string;
  /** Icon, logo, or illustration shown in the card's media slot. */
  media: ReactNode;
  link?: {
    href: string;
    label: string;
  };
  disabled?: boolean;
}

export interface CardRadioGroupProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: CardRadioOption<T>[];
  'aria-label': string;
  className?: string;
  /** `tile` stacks media over text; `row` keeps them side by side for long lists. */
  layout?: 'tile' | 'row';
  /** Minimum column width; the grid fills as many columns as fit. */
  minColumnWidth?: string;
}

/**
 * Selectable cards backed by a Base UI radio group. Cards raise on hover and pick up an orange ring plus a check badge
 * when checked, so the chosen option reads at a glance without color alone.
 */
export default function CardRadioGroup<T extends string = string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
  layout = 'tile',
  minColumnWidth = '11rem',
}: CardRadioGroupProps<T>) {
  const isHydrated = useIsHydrationSettled();
  const hasLinks = layout === 'tile' && options.some((option) => option.link);

  return (
    <RadioGroup
      value={value}
      // SAFETY: every rendered Radio.Root receives an option value of type T, so the group can only report one back.
      onValueChange={(newValue) => onChange(newValue as T)}
      aria-label={ariaLabel}
      data-selection-ready={isHydrated ? '' : undefined}
      className={twMerge(clsx('grid auto-rows-fr gap-3'), className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minColumnWidth}), 1fr))` }}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const showSelection = isHydrated && isSelected;

        return (
          <div
            key={option.value}
            className={clsx(
              'relative flex min-w-0 rounded-xl corner-squircle transition-transform duration-150 ease-out',
              option.disabled
                ? 'cursor-not-allowed opacity-50'
                : 'intent:-translate-y-0.5 motion-reduce:intent:translate-y-0'
            )}
          >
            <Radio.Root
              value={option.value}
              disabled={option.disabled}
              className={clsx(
                'group relative flex h-full w-full min-w-0 text-left select-none',
                'rounded-xl corner-squircle border bg-surface ring-1 ring-transparent',
                'transition-[background-color,border-color,box-shadow] duration-200 ease-out',
                layout === 'tile' ? clsx('flex-col gap-3 p-4', hasLinks && 'pb-11') : 'items-center gap-3 p-3',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                option.disabled ? 'cursor-not-allowed' : 'cursor-pointer intent:shadow-md',
                showSelection
                  ? 'border-accent bg-surface-raised shadow-sm ring-accent'
                  : 'border-line intent:border-line-strong'
              )}
            >
              <Radio.Indicator className="sr-only" />
              <span
                aria-hidden="true"
                className={clsx(
                  'flex shrink-0 items-center justify-center rounded-lg corner-squircle border border-line',
                  'bg-surface-raised text-faded-black dark:bg-faded-black dark:text-manila-light',
                  layout === 'tile' ? 'size-12 self-start' : 'size-10 self-center'
                )}
              >
                {option.media}
              </span>
              {/* The check badge is absolutely positioned on the right, so the text reserves room for it. */}
              <span className={clsx('min-w-0 flex-1', layout === 'tile' ? 'pr-6' : 'pr-8')}>
                <span className={clsx('block truncate font-semibold', layout === 'tile' ? 'text-p2' : 'text-p3')}>
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-p4 dark:text-muted mt-0.5 block">{option.description}</span>
                )}
              </span>
              <span
                aria-hidden="true"
                className={clsx(
                  'absolute flex size-5 items-center justify-center rounded-full border transition-[color,background-color,border-color,opacity,transform] duration-200',
                  layout === 'tile' ? 'top-3 right-3' : 'top-1/2 right-3 -translate-y-1/2',
                  showSelection
                    ? 'scale-100 border-accent bg-accent text-manila-light opacity-100'
                    : 'scale-75 border-line-strong bg-transparent text-transparent opacity-0 group-intent:opacity-100'
                )}
              >
                <Check className="size-4" />
              </span>
            </Radio.Root>
            {option.link && layout === 'tile' && (
              <a
                href={option.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent text-p4 intent:underline absolute bottom-3 left-4 z-10 inline-flex items-center gap-1 font-semibold no-underline"
              >
                {option.link.label}
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </a>
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}
