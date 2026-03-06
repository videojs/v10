import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { twMerge } from '@/utils/twMerge';

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
}

export default function ImageRadioGroup<T extends string = string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
}: ImageRadioGroupProps<T>) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(newValue) => onChange(newValue as T)}
      aria-label={ariaLabel}
      className={twMerge(clsx('grid auto-rows-min gap-4'), className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(calc(var(--spacing) * 20), 1fr))`,
      }}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const isDisabled = option.disabled;

        return (
          <Radio.Root
            value={option.value}
            className={clsx(
              'group inline-flex items-center gap-2 flex-col',
              isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            )}
            key={option.value}
            disabled={isDisabled}
          >
            <div
              className={clsx(
                'relative flex items-center justify-center aspect-square w-full rounded-xs',
                'border border-manila-75 dark:border-manila-75',
                isSelected
                  ? 'bg-manila-dark'
                  : !isDisabled &&
                      // TODO(old-color): light-80, dark-100, light-60
                      'bg-light-80 dark:bg-dark-100 group-intent:bg-light-60/50 dark:group-intent:bg-manila-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bright-yellow/50'
              )}
            >
              <Radio.Indicator className="sr-only" />
              <div className="flex items-center justify-center w-full h-full">{option.image}</div>
            </div>
            <span className={clsx('text-p3', isSelected && 'font-bold')}>{option.label}</span>
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
}
