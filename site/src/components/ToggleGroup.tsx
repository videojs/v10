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
        'w-full md:w-auto inline-flex items-stretch p-1 border-2 border-gray-800 rounded-sm overflow-hidden',
        className
      )}
      aria-label={ariaLabel}
      multiple={multiple}
    >
      {options.map((option, index) => {
        const isPressed = value.includes(option.value as T);
        const isDisabled = disabled || option.disabled;
        const isLast = index === options.length - 1;
        const isFirst = index === 0;

        return (
          <>
            <Toggle
              key={option.value}
              value={option.value}
              disabled={isDisabled}
              className={twMerge(
                clsx(
                  'relative',
                  minimal ? 'px-4' : 'px-5 md:px-10',
                  'flex items-center justify-center py-2! text-sm tracking-wider font-display-extended uppercase font-bold',
                  isDisabled ? 'cursor-wait opacity-50' : 'cursor-pointer',
                  isPressed ? 'bg-faded-black text-light-manila' : 'bg-transparent'
                ),
                toggleClassName
              )}
              aria-label={option['aria-label']}
            >
              {option.label}
            </Toggle>
            {!isLast && minimal && <span className="block h-100% w-px bg-faded-black -mr-4" />}
            {!isLast && (
              <span className="flex px-1 gap-0.5 h-full">
                <span className="block h-full w-px bg-faded-black" />
                <span className="block h-full w-px bg-faded-black" />
                <span className="block h-full w-px bg-faded-black" />
              </span>
            )}
          </>
        );
      })}
    </BaseToggleGroup>
  );
}
