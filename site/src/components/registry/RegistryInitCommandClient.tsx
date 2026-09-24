import {
  defaultInstallationTemplate,
  installationProjectFiles,
  type RegistryFramework,
  resolveRegistryStyling,
  resolveInstallationTemplate,
  shadcnInitCommand,
  shadcnProjectConfiguration,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import PackageManagerTabs from '@/components/installation/PackageManagerTabs';
import {
  useInstallationTemplate,
  useRegistryProjectFramework,
  useRegistryStyling,
} from '@/components/installation/useRegistryProjectFramework';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

interface Props {
  framework: RegistryFramework;
  installation: boolean;
}

function ConfigurationBlock({ block }: { block: { code: string; filename: string; language: 'js' | 'json' | 'ts' } }) {
  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="App configuration">
        <Tab value={block.filename} initial>
          {block.filename}
        </Tab>
      </TabsList>
      <TabsPanel value={block.filename} initial>
        <ClientCode code={block.code} lang={block.language} />
      </TabsPanel>
    </TabsRoot>
  );
}

export default function RegistryInitCommandClient({ framework, installation }: Props) {
  const projectFramework = useRegistryProjectFramework(framework);
  const $template = useInstallationTemplate(defaultInstallationTemplate(projectFramework));
  const template = resolveInstallationTemplate(projectFramework, $template);
  const sourceFramework: RegistryFramework = projectFramework === 'react' ? 'react' : 'html';
  const styling = resolveRegistryStyling(sourceFramework, useRegistryStyling());
  const project = installationProjectFiles(projectFramework, template);
  const configuration = shadcnProjectConfiguration(projectFramework, template, styling, project.componentsAlias);
  const aliasSetup = configuration.aliasSetup.map((block) => <ConfigurationBlock key={block.filename} block={block} />);

  if (configuration.mode === 'components-json') {
    return (
      <div>
        {aliasSetup}
        <ConfigurationBlock
          block={{ code: configuration.componentsConfig!, filename: 'components.json', language: 'json' }}
        />
      </div>
    );
  }

  const commands = {
    npm: shadcnInitCommand('npm'),
    pnpm: shadcnInitCommand('pnpm'),
    yarn: shadcnInitCommand('yarn'),
    bun: shadcnInitCommand('bun'),
  };

  return (
    <div>
      {aliasSetup}
      <PackageManagerTabs commands={commands} syncSelection={installation} />
    </div>
  );
}
