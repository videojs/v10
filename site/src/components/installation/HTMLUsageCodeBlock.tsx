import { generateHTMLUsageCode } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

interface Props {
  installMethod?: 'cdn';
}

export default function HTMLUsageCodeBlock({ installMethod }: Props) {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const $renderer = useSelection('renderer');
  const selectedInstallMethod = useSelection('installMethod');
  const $sourceUrl = useSelection('sourceUrl');

  const result = generateHTMLUsageCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
    sourceUrl: $sourceUrl,
    installMethod: installMethod ?? selectedInstallMethod,
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
