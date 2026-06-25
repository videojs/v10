import { Select as BaseSelect } from '@base-ui/react/select';
import clsx from 'clsx';
import Check from '@/assets/icons/check.svg?react';
import DropdownArrow from '@/assets/icons/dropdown-arrow.svg?react';
import { twMerge } from '@/utils/twMerge';

export interface SelectOption<T = string> {
  value: T | null;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup<T = string> {
  label: string;
  options: SelectOption<T>[];
}

export interface SelectProps<T = string> {
  value: T | null;
  onChange: (value: T | null) => void;
  /** Flat options. Provide this or `groups`, not both. */
  options?: SelectOption<T>[];
  /** Grouped options, rendered as labelled sections. Provide this or `options`. */
  groups?: SelectGroup<T>[];
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  groups,
  className,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}: SelectProps<T>) {
  // Base UI resolves the selected value's label for the trigger from `items`,
  // so it always receives the flattened set regardless of grouping.
  const flatOptions = options ?? groups?.flatMap((group) => group.options) ?? [];

  const renderItem = (option: SelectOption<T>) => (
    <BaseSelect.Item
      key={option.value}
      value={option.value}
      disabled={option.disabled}
      className={clsx(
        'flex items-center gap-2 p-2',
        option.disabled ? 'opacity-50 cursor-default' : 'cursor-pointer intent:bg-manila-75 dark:intent:bg-warm-gray',
        option.value === value && 'bg-manila-75 dark:bg-warm-gray'
      )}
    >
      <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className="ml-auto inline-flex items-center">
        <Check width={'1rem'} />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );

  return (
    <BaseSelect.Root value={value} onValueChange={onChange} items={flatOptions}>
      <BaseSelect.Trigger
        className={twMerge(
          clsx(
            'inline-flex items-center gap-2 bg-manila-50 dark:bg-warm-gray intent:bg-manila-dark dark:intent:bg-soot border border-manila-dark dark:border-warm-gray rounded-xs text-p3 p-2 text-left'
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
              'border border-manila-dark dark:border-soot rounded-xs bg-manila-light dark:bg-soot shadow-xl text-p3',
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
              {groups
                ? groups.map((group) => (
                    <BaseSelect.Group key={group.label}>
                      <BaseSelect.GroupLabel className="p-2 font-bold">{group.label}</BaseSelect.GroupLabel>
                      {group.options.map(renderItem)}
                    </BaseSelect.Group>
                  ))
                : flatOptions.map(renderItem)}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
