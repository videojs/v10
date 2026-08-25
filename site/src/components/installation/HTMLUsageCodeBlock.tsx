import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { installMethod, renderer, skin, sourceUrl, useCase } from '@/stores/installation';
import { generateHTMLUsageCode } from '@/utils/installation/codegen';

export default function HTMLUsageCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);
  const $installMethod = useStore(installMethod);
  const $sourceUrl = useStore(sourceUrl);

  const result = generateHTMLUsageCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
    sourceUrl: $sourceUrl,
    installMethod: $installMethod,
  });

  return (
    <>
      {result.imports && (
        <TabsRoot maxWidth={false}>
          <TabsList label="HTML implementation">
            <Tab value="typescript" initial>
              TypeScript
            </Tab>
          </TabsList>
          <TabsPanel value="typescript" initial>
            <ClientCode code={result.imports} lang="ts" />
          </TabsPanel>
        </TabsRoot>
      )}
      <TabsRoot maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="html" initial>
            HTML
          </Tab>
        </TabsList>
        <TabsPanel value="html" initial>
          <ClientCode code={result.html} lang="html" />
        </TabsPanel>
      </TabsRoot>
    </>
  );
}
