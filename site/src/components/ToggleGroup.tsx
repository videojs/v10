import { Toggle } from '@base-ui-components/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui-components/react/toggle-group';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

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
}: ToggleGroupProps<T>) {
  return (
    <BaseToggleGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className={twMerge(
        'inline-flex items-center gap-1 bg-light-60 dark:bg-dark-90 dark:text-light-100 border border-light-40 dark:border-dark-80 rounded-lg p-1',
        className
      )}
      aria-label={ariaLabel}
      multiple={multiple}
    >
      {options.map((option) => {
        const isPressed = value.includes(option.value as T);
        const isDisabled = disabled || option.disabled;

        return (
          <Toggle
            key={option.value}
            value={option.value}
            disabled={isDisabled}
            className={twMerge(
              clsx(
                'relative',
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm',
                isDisabled ? 'cursor-wait opacity-50' : 'cursor-pointer',
                isPressed
                  ? 'bg-light-80 dark:bg-dark-100'
                  : !isDisabled
                    ? 'intent:bg-light-80/50 dark:intent:bg-dark-100/50'
                    : ''
              ),
              toggleClassName
            )}
            aria-label={option['aria-label']}
          >
            {option.label}
          </Toggle>
        );
      })}
    </BaseToggleGroup>
  );
}
