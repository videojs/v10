import { Tabs as TabsPrimitive } from '@base-ui-components/react/tabs';

import { Tab } from './Tab';
import { TabIndicator } from './TabIndicator';
import { TabList } from './TabList';
import { TabPanel } from './TabPanel';

export const Tabs = {
  ...TabsPrimitive,
  Tab,
  List: TabList,
  Panel: TabPanel,
  Indicator: TabIndicator,
} as typeof TabsPrimitive;
