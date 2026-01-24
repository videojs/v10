import { Tabs as TabsPrimitive } from '@base-ui-components/react/tabs';
import clsx from 'clsx';
import type { ComponentProps } from 'react';

export function TabList(props: ComponentProps<typeof TabsPrimitive.List>): JSX.Element {
  const { className, ...rest } = props;
  return <TabsPrimitive.List className={clsx('flex gap-1 relative z-0', className)} {...rest} />;
}
