import { Radio } from '@base-ui-components/react/radio';
import { RadioGroup } from '@base-ui-components/react/radio-group';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export interface ImageRadioOption<T = string> {
  value: T;
  label: string;
  image: ReactNode;
  disabled?: boolean;
}

export interface ImageRadioGroupProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: ImageRadioOption<T>[];
  'aria-label': string;
  className?: string;
  size?: 'sm' | 'md';
  labelPosition?: 'block' | 'inline';
}

export default function ImageRadioGroup<T extends string = string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
  size = 'md',
  labelPosition = 'block',
}: ImageRadioGroupProps<T>) {
  const boxSize = size === 'sm' ? 8 : 20;
  return (
    <RadioGroup
      value={value}
      onValueChange={(newValue) => onChange(newValue as T)}
      aria-label={ariaLabel}
      className={twMerge(clsx('grid auto-rows-min', size === 'sm' && 'gap-2', size === 'md' && 'gap-4'), className)}
      style={{
        gridTemplateColumns:
          labelPosition === 'block'
            ? `repeat(auto-fill, minmax(calc(var(--spacing) * ${boxSize}), 1fr))`
            : 'repeat(auto-fill, minmax(calc(var(--spacing) * 40), 1fr))',
      }}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const isDisabled = option.disabled;

        return (
          <Radio.Root
            value={option.value}
            className={clsx(
              'group inline-flex items-center gap-2',
              isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              labelPosition === 'block' ? 'flex-col' : 'flex-row'
            )}
            key={option.value}
            disabled={isDisabled}
          >
            <div
              className={clsx(
                'relative flex items-center justify-center aspect-square',
                size === 'sm' && 'rounded-lg',
                size === 'md' && 'rounded-xl',
                'border border-light-40 dark:border-dark-80',
                isSelected
                  ? 'bg-light-60 dark:bg-dark-90'
                  : !isDisabled &&
                      'bg-light-80 dark:bg-dark-100 group-intent:bg-light-60/50 dark:group-intent:bg-dark-90/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow/50'
              )}
              style={{
                width: labelPosition === 'block' ? '100%' : undefined,
                height: labelPosition === 'inline' ? `calc(var(--spacing) * ${boxSize})` : undefined,
              }}
            >
              <Radio.Indicator className="sr-only" />
              <div className="flex items-center justify-center w-full h-full">{option.image}</div>
            </div>
            <span className={clsx('text-sm', isSelected && 'font-medium')}>{option.label}</span>
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
}
