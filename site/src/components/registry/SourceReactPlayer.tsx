import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateSourceReactCreateCode } from '@/utils/installation/codegen';

import { useSelection } from '../installation/useSelection';

export default function SourceReactPlayer() {
  const code = generateSourceReactCreateCode({
    useCase: useSelection('useCase'),
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="player" initial>
          app/page.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={code['app/page.tsx']} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
