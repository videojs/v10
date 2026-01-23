import { Select as BaseSelect } from '@base-ui-components/react/select';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface SelectOption<T = string> {
  value: T | null;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T = string> {
  value: T | null;
  onChange: (value: T | null) => void;
  options: SelectOption<T>[];
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}: SelectProps<T>) {
  return (
    <BaseSelect.Root value={value} onValueChange={onChange} items={options}>
      <BaseSelect.Trigger
        className={twMerge(
          clsx(
            'inline-flex items-center gap-2 bg-light-60 dark:bg-dark-90 dark:text-light-100 border border-light-40 dark:border-dark-80 rounded-lg text-sm p-2'
          ),
          className
        )}
        aria-label={ariaLabel}
        data-testid={dataTestId}
      >
        <BaseSelect.Value className="flex-1 min-w-0 truncate" />
        <BaseSelect.Icon>
          <ChevronDown size={12} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} className="z-50">
          <BaseSelect.Popup
            className={clsx(
              'border border-light-40 dark:border-dark-80 rounded-lg bg-light-60 dark:bg-dark-80 shadow-xl text-sm',
              'overflow-hidden'
            )}
            style={
              {
                minWidth: 'var(--anchor-width)',
              } as React.CSSProperties
            }
          >
            <BaseSelect.List
              // TODO a slick transition
              className={clsx('overflow-y-auto')}
              style={
                {
                  maxHeight: 'calc(var(--available-height) - var(--spacing) * 2)',
                  transformOrigin: 'var(--transform-origin)',
                } as React.CSSProperties
              }
            >
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={clsx(
                    'flex items-center gap-2 p-2',
                    option.disabled
                      ? 'opacity-50 cursor-default'
                      : 'cursor-pointer intent:bg-light-80 dark:intent:bg-dark-100',
                    option.value === value && 'bg-light-80 dark:bg-dark-100'
                  )}
                >
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="ml-auto inline-flex items-center">
                    <Check size={16} />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
