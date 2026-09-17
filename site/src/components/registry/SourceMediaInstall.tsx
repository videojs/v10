import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateSourceMediaInstallCode } from '@/utils/installation/codegen';

import { useSelection } from '../installation/useSelection';

export default function SourceMediaInstall() {
  const install = generateSourceMediaInstallCode(useSelection('renderer'));
  if (!install) return null;

  return (
    <section className="mx-auto mt-16 w-full max-w-3xl" aria-labelledby="media-adapter-heading">
      <h2 id="media-adapter-heading" className="font-display text-h3 @lg:text-h25 mb-8 leading-tight uppercase">
        Install the media adapter
      </h2>
      <p className="my-4 leading-relaxed">
        This media source needs a separate playback adapter. Install it with your package manager.
      </p>
      <TabsRoot>
        <TabsList label="Package manager">
          <Tab value="npm" initial>
            npm
          </Tab>
          <Tab value="pnpm">pnpm</Tab>
          <Tab value="yarn">yarn</Tab>
          <Tab value="bun">bun</Tab>
        </TabsList>
        {(['npm', 'pnpm', 'yarn', 'bun'] as const).map((runner, index) => (
          <TabsPanel key={runner} value={runner} initial={index === 0}>
            <ClientCode code={install[runner]} lang="bash" />
          </TabsPanel>
        ))}
      </TabsRoot>
    </section>
  );
}
