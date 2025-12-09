import type { ComponentProps } from 'react';
import { Tabs as TabsPrimitive } from '@base-ui-components/react/tabs';
import clsx from 'clsx';

export function Tab(props: ComponentProps<typeof TabsPrimitive.Tab>): JSX.Element {
  const { className, ...rest } = props;
  return (
    <TabsPrimitive.Tab
      className={clsx(
        'flex h-8 items-center justify-center border-0 px-2 text-sm font-medium break-keep whitespace-nowrap text-zinc-600 outline-none select-none before:inset-x-0 before:inset-y-1 before:rounded-sm before:-outline-offset-1 before:outline-blue-800 hover:text-zinc-900 focus-visible:relative focus-visible:before:absolute focus-visible:before:outline-2 data-active:text-zinc-900 ',
        // Dark mode styles
        'dark:text-zinc-400 dark:hover:text-zinc-100 dark:data-active:text-zinc-900',
        className,
      )}
      {...rest}
    />
  );
}
