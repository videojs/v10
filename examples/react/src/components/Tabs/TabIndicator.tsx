import type { ComponentProps } from 'react';
import { Tabs as TabsPrimitive } from '@base-ui-components/react/tabs';
import clsx from 'clsx';

export function TabIndicator(props: ComponentProps<typeof TabsPrimitive.Indicator>): JSX.Element {
  const { className, ...rest } = props;
  return (
    <TabsPrimitive.Indicator
      className={clsx(
        'absolute top-1/2 left-0 z-[-1] h-6 w-(--active-tab-width) translate-x-(--active-tab-left) -translate-y-1/2 rounded-sm bg-zinc-100 transition-all duration-200 ease-in-out',
        className,
      )}
      {...rest}
    />
  );
}
