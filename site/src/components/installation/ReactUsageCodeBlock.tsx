import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateReactUsageCode } from '@/utils/installation/codegen';

import { useSelection } from './useSelection';

export default function ReactUsageCodeBlock() {
  const $useCase = useSelection('useCase');
  const $renderer = useSelection('renderer');
  const $sourceUrl = useSelection('sourceUrl');

  const result = generateReactUsageCode({
    useCase: $useCase,
    renderer: $renderer,
    sourceUrl: $sourceUrl,
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React usage">
        <Tab value="react" initial>
          ./app/page.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={result['App.tsx']} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
