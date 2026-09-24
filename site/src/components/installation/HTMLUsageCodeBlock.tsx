import {
  generateHTMLUsageCode,
  installationHtmlEntrySetup,
  installationHtmlPageCode,
  installationProjectFiles,
} from '@videojs/installation';

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
  const $template = useSelection('template');
  const project = installationProjectFiles('html', $template);
  const method = installMethod ?? selectedInstallMethod;

  const result = generateHTMLUsageCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
    sourceUrl: $sourceUrl,
    installMethod: method,
  });
  const entrySetup = method === 'cdn' ? [] : installationHtmlEntrySetup($template, project.usage!);
  const html = method === 'cdn' ? result.html : installationHtmlPageCode(result.html, $template, project.usage!);

  return (
    <>
      {entrySetup.map((block) => (
        <div key={block.filename}>
          <p>
            Merge this entry into the existing <code>{block.filename}</code> configuration, keeping its other inputs,
            plugins, and options:
          </p>
          <ClientCode code={block.code} lang={block.language} />
        </div>
      ))}
      {result.imports && (
        <TabsRoot maxWidth={false}>
          <TabsList label="HTML implementation">
            <Tab value="typescript" initial>
              {project.usage}
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
            {project.player}
          </Tab>
        </TabsList>
        <TabsPanel value="html" initial>
          <ClientCode code={html} lang="html" />
        </TabsPanel>
      </TabsRoot>
    </>
  );
}
