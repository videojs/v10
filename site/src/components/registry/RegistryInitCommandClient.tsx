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

interface Props {
  framework: RegistryFramework;
  installation: boolean;
}

export default function RegistryInitCommandClient({ framework, installation }: Props) {
  const projectFramework = useRegistryProjectFramework(framework);
  const $template = useInstallationTemplate(defaultInstallationTemplate(projectFramework));
  const template = resolveInstallationTemplate(projectFramework, $template);
  const sourceFramework: RegistryFramework = projectFramework === 'react' ? 'react' : 'html';
  const styling = resolveRegistryStyling(sourceFramework, useRegistryStyling());
  const project = installationProjectFiles(projectFramework, template);
  const configuration = shadcnProjectConfiguration(projectFramework, template, styling, project.componentsAlias);
  const aliasSetup = configuration.aliasSetup.map((block) => (
    <div key={block.filename}>
      <p className="text-p4 mb-2">
        Merge into <code>{block.filename}</code>:
      </p>
      <ClientCode code={block.code} lang={block.language} />
    </div>
  ));

  if (configuration.mode === 'components-json') {
    return (
      <div className="grid gap-6">
        {aliasSetup}
        <div>
          <p className="text-p4 mb-2">
            Create <code>components.json</code>:
          </p>
          <ClientCode code={configuration.componentsConfig!} lang="json" />
        </div>
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
    <div className="grid gap-6">
      {aliasSetup}
      <PackageManagerTabs commands={commands} syncSelection={installation} />
    </div>
  );
}
