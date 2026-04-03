import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { renderer, sourceUrl } from '@/stores/installation';
import { generateReactUsageCode } from '@/utils/installation/codegen';

export default function ReactUsageCodeBlock() {
  const $renderer = useStore(renderer);
  const $sourceUrl = useStore(sourceUrl);

  const result = generateReactUsageCode({
    framework: 'react',
    useCase: 'default-video',
    skin: 'video',
    renderer: $renderer,
    sourceUrl: $sourceUrl,
    installMethod: 'npm',
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
