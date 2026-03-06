import { Select as BaseSelect } from '@base-ui/react/select';
import clsx from 'clsx';
import Check from '@/components/icons/check.svg?react';
import DropdownArrow from '@/components/icons/dropdown-arrow.svg?react';
import { twMerge } from '@/utils/twMerge';

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
            'inline-flex items-center gap-2 bg-manila-50 dark:bg-manila-dark intent:bg-manila-dark text-faded-black dark:text-manila-light border border-manila-dark rounded-xs text-p3 p-2 text-left'
          ),
          className
        )}
        aria-label={ariaLabel}
        data-testid={dataTestId}
      >
        <BaseSelect.Value className="flex-1 min-w-0 truncate" />
        &nbsp;
        <BaseSelect.Icon>
          <DropdownArrow width={'1rem'} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} className="z-50">
          <BaseSelect.Popup
            className={clsx(
              'border border-manila-dark rounded-xs bg-manila-light dark:bg-dark-80 shadow-xl text-p3',
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
                      : // TODO(old-color): light-80, dark-100
                        'cursor-pointer intent:bg-manila-75 dark:intent:bg-dark-100',
                    // TODO(old-color): light-80, dark-100
                    option.value === value && 'bg-manila-75 dark:bg-dark-100'
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
