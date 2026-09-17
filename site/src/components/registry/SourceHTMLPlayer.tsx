import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateSourceHTMLUsageCode } from '@/utils/installation/codegen';

import { useSelection } from '../installation/useSelection';

export default function SourceHTMLPlayer() {
  const code = generateSourceHTMLUsageCode({
    useCase: useSelection('useCase'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
  });

  return (
    <>
      <p>
        In <code>{code.skinFile}</code>, replace the “Add a compatible media element here” comment with:
      </p>
      <ClientCode code={code.media} lang="html" />
      <p>Import the player, media, and installed skin from your app entry:</p>
      <TabsRoot maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="typescript" initial>
            player.ts
          </Tab>
        </TabsList>
        <TabsPanel value="typescript" initial>
          <ClientCode code={code.imports} lang="ts" />
        </TabsPanel>
      </TabsRoot>
      <p>Then paste the contents of that skin file inside the player:</p>
      <TabsRoot maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="html" initial>
            index.html
          </Tab>
        </TabsList>
        <TabsPanel value="html" initial>
          <ClientCode code={code.player} lang="html" />
        </TabsPanel>
      </TabsRoot>
    </>
  );
}
