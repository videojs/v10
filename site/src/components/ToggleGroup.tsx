import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import clsx from 'clsx';
import { Fragment } from 'react';
import { twMerge } from '@/utils/twMerge';

export interface ToggleOption<T = string> {
  value: T;
  label: React.ReactNode;
  'aria-label'?: string;
  disabled?: boolean;
}

export interface ToggleGroupProps<T = string> {
  value: T[];
  onChange: (value: T[]) => void;
  options: ToggleOption<T>[];
  className?: string;
  toggleClassName?: string;
  disabled?: boolean;
  'aria-label'?: string;
  multiple?: boolean;
  minimal?: boolean;
}

export default function ToggleGroup<T extends string = string>({
  value,
  onChange,
  options,
  className,
  toggleClassName,
  disabled,
  'aria-label': ariaLabel,
  multiple = false,
  minimal,
}: ToggleGroupProps<T>) {
  return (
    <BaseToggleGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className={twMerge(
        minimal ? 'flex gap-0' : 'grid max-w-95 mx-auto',
        'w-full items-stretch p-0.75 border rounded-xs',
        className
      )}
      aria-label={ariaLabel}
      multiple={multiple}
      style={{ gridTemplateColumns: '1fr auto 1fr' }}
    >
      {options.map((option, index) => {
        const isPressed = value.includes(option.value as T);
        const isDisabled = disabled || option.disabled;
        const isLast = index === options.length - 1;

        return (
          <Fragment key={option.value as string}>
            <Toggle
              value={option.value}
              disabled={isDisabled}
              className={twMerge(
                clsx(
                  'relative',
                  'flex items-center justify-center font-display tracking-normal leading-none uppercase font-bold',
                  minimal ? 'px-3 py-2' : 'px-4 py-3',
                  'text-(length:--text) md:text-h4',
                  isDisabled ? 'cursor-wait opacity-50' : 'cursor-pointer',
                  isPressed
                    ? 'bg-faded-black dark:bg-manila-light text-manila-light dark:text-faded-black'
                    : 'bg-transparent'
                ),
                toggleClassName
              )}
              style={{ '--text': '0.75rem' } as React.CSSProperties}
              aria-label={option['aria-label']}
            >
              {option.label}
            </Toggle>
            {!isLast && minimal && <span className="block h-full w-px bg-faded-black dark:bg-manila-light" />}
            {!isLast && !minimal && (
              <span className="flex px-0.75 gap-0.75 h-full">
                <span className="block h-full w-px bg-faded-black dark:bg-manila-light" />
                <span className="block h-full w-px bg-faded-black dark:bg-manila-light" />
                <span className="block h-full w-px bg-faded-black dark:bg-manila-light" />
              </span>
            )}
          </Fragment>
        );
      })}
    </BaseToggleGroup>
  );
}
