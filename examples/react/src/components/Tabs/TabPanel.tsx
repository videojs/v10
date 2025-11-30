import type { ComponentProps } from 'react';
import { Tabs as TabsPrimitive } from '@base-ui-components/react/tabs';
import clsx from 'clsx';

export function TabPanel(props: ComponentProps<typeof TabsPrimitive.Panel>): JSX.Element {
  const { className, ...rest } = props;
  return (
    <TabsPrimitive.Panel
      className={clsx(
        'outline-blue-800 focus-visible:rounded-md focus-visible:outline-2',
        className,
      )}
      {...rest}
    />
  );
}
