import { Select as BaseSelect } from '@base-ui/react/select';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import Check from '@/components/icons/dropdown-arrow.svg?react';

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
            'inline-flex items-center gap-2 bg-50-manila dark:bg-dark-manila text-faded-black dark:text-light-manila border border-black dark:border-dark-manila rounded-sm text-p3 p-2'
          ),
          className
        )}
        aria-label={ariaLabel}
        data-testid={dataTestId}
      >
        <BaseSelect.Value className="flex-1 min-w-0 truncate" />
        &nbsp;
        <BaseSelect.Icon>
          <Check width={'1rem'} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} className="z-50">
          <BaseSelect.Popup
            className={clsx(
              'border border-light-40 dark:border-dark-80 rounded-lg bg-light-60 dark:bg-dark-80 shadow-xl text-sm',
              'overflow-y-auto'
            )}
            style={
              {
                minWidth: 'var(--anchor-width)',
                maxHeight: 'var(--available-height)',
              } as React.CSSProperties
            }
          >
            <BaseSelect.List>
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
                    <Check width={'1rem'} />
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
