import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { shared } from '@/components/typography/styles';
import { generateSourceHTMLUsageCode } from '@/utils/installation/codegen';

import { useSelection } from '../installation/useSelection';

type SourceHTMLPlayerPart = 'imports' | 'media' | 'player';

interface Props {
  part: SourceHTMLPlayerPart;
}

function CodeBlock({ code, label, lang }: { code: string; label: string; lang: 'html' | 'ts' }) {
  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="HTML implementation">
        <Tab value={label} initial>
          {label}
        </Tab>
      </TabsList>
      <TabsPanel value={label} initial>
        <ClientCode code={code} lang={lang} />
      </TabsPanel>
    </TabsRoot>
  );
}

export default function SourceHTMLPlayer({ part }: Props) {
  const code = generateSourceHTMLUsageCode({
    useCase: useSelection('useCase'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
  });

  if (part === 'media') {
    return (
      <>
        <p className={`${shared.p} ${shared.prose}`}>
          In <code>{code.skinFile}</code>, replace the “Add a compatible media element here” comment with:
        </p>
        <CodeBlock code={code.media} label="skin.html" lang="html" />
      </>
    );
  }

  if (part === 'imports') {
    return (
      <>
        <p className={`${shared.p} ${shared.prose}`}>
          Create <code>src/player.ts</code> and import the player, media, and installed skin:
        </p>
        <CodeBlock code={code.imports} label="src/player.ts" lang="ts" />
      </>
    );
  }

  return (
    <>
      <p className={`${shared.p} ${shared.prose}`}>
        Paste the updated skin markup inside the player, then load the entry module:
      </p>
      <CodeBlock code={code.player} label="index.html" lang="html" />
    </>
  );
}
