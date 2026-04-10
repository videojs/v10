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
      {result.js && (
        <TabsRoot maxWidth={false}>
          <TabsList label="HTML implementation">
            <Tab value="javascript" initial>
              JavaScript
            </Tab>
          </TabsList>
          <TabsPanel value="javascript" initial>
            <ClientCode code={result.js} lang="javascript" />
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
