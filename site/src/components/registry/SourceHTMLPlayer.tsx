import {
  defaultInstallationTemplate,
  generateSourceHTMLUsageCode,
  installationHtmlEntrySetup,
  installationHtmlPageCode,
  installationProjectFiles,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { focusLinesContaining } from '@/components/Code/focusLines';
import {
  useInstallationTemplate,
  useRegistryProjectFramework,
} from '@/components/installation/useRegistryProjectFramework';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { shared } from '@/components/typography/styles';

import { useSelection } from '../installation/useSelection';

type SourceHTMLPlayerPart = 'imports' | 'media' | 'player';

interface Props {
  part: SourceHTMLPlayerPart;
}

interface CodeTab {
  code: string;
  focusLines?: readonly number[];
  label: string;
  lang: 'html' | 'js' | 'json' | 'ts';
  value: string;
}

function CodeTabs({ label, tabs }: { label: string; tabs: readonly CodeTab[] }) {
  return (
    <TabsRoot maxWidth={false}>
      <TabsList label={label}>
        {tabs.map((tab, index) => (
          <Tab key={tab.value} value={tab.value} initial={index === 0}>
            {tab.label}
          </Tab>
        ))}
      </TabsList>
      {tabs.map((tab, index) => (
        <TabsPanel key={tab.value} value={tab.value} initial={index === 0}>
          <ClientCode code={tab.code} focusLines={tab.focusLines} lang={tab.lang} />
        </TabsPanel>
      ))}
    </TabsRoot>
  );
}

export default function SourceHTMLPlayer({ part }: Props) {
  const projectFramework = useRegistryProjectFramework('html');
  const template = useInstallationTemplate(defaultInstallationTemplate(projectFramework));
  const useCase = useSelection('useCase');
  const project = installationProjectFiles(projectFramework, template, useCase);
  const options = {
    useCase,
    renderer: useSelection('renderer'),
    extensions: useSelection('extensions'),
    sourceUrl: useSelection('sourceUrl'),
    componentsAlias: project.componentsAlias,
    componentsDirectory: project.componentsDirectory,
  };
  const html = generateSourceHTMLUsageCode(options);

  if (part === 'media') {
    return (
      <>
        <p className={`${shared.p} ${shared.prose}`}>
          In <code>{html.skinFile}</code>, replace the “Add a compatible media element here” comment with:
        </p>
        <CodeTabs
          label="Skin source"
          tabs={[{ code: html.media, label: html.skinFile, lang: 'html', value: 'skin' }]}
        />
      </>
    );
  }

  if (part === 'imports') {
    const entrySetup = installationHtmlEntrySetup(template, project.usage!);

    return (
      <>
        {entrySetup.map((block) => (
          <div key={block.filename}>
            <p className={`${shared.p} ${shared.prose}`}>
              Merge the player entry into <code>{block.filename}</code>, keeping its other inputs, plugins, and options:
            </p>
            <CodeTabs
              label="App configuration"
              tabs={[
                {
                  code: block.code,
                  focusLines: focusLinesContaining(block.code, [
                    'import ',
                    'plugins:',
                    'input:',
                    'laravel({',
                    'resolve:',
                    'alias:',
                  ]),
                  label: block.filename,
                  lang: block.language,
                  value: 'entry',
                },
              ]}
            />
          </div>
        ))}
        <p className={`${shared.p} ${shared.prose}`}>
          Create <code>{project.usage}</code> and import the player, media, and installed skin:
        </p>
        <CodeTabs
          label="HTML implementation"
          tabs={[{ code: html.imports, label: project.usage!, lang: 'ts', value: 'imports' }]}
        />
      </>
    );
  }

  return (
    <>
      <p className={`${shared.p} ${shared.prose}`}>
        Paste the updated skin markup inside the player, then load the entry module:
      </p>
      <CodeTabs
        label="HTML implementation"
        tabs={[
          {
            code: installationHtmlPageCode(html.player, template, project.usage!),
            label: project.player,
            lang: 'html',
            value: 'player',
          },
        ]}
      />
    </>
  );
}
