import {
  defaultInstallationTemplate,
  generateSourceHTMLUsageCode,
  generateSourceSvelteUsageCode,
  generateSourceVueUsageCode,
  installationHtmlEntrySetup,
  installationHtmlPageCode,
  installationProjectFiles,
  installationVueConfigFilename,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
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
  label: string;
  lang: 'html' | 'js' | 'ts';
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
          <ClientCode code={tab.code} lang={tab.lang} />
        </TabsPanel>
      ))}
    </TabsRoot>
  );
}

export default function SourceHTMLPlayer({ part }: Props) {
  const projectFramework = useRegistryProjectFramework('html');
  const template = useInstallationTemplate(defaultInstallationTemplate(projectFramework));
  const project = installationProjectFiles(projectFramework, template);
  const options = {
    useCase: useSelection('useCase'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
    componentsAlias: project.componentsImportAlias ?? project.componentsAlias,
    componentsDirectory: project.componentsDirectory,
    playerImport: project.playerImport,
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
    if (projectFramework === 'vue') {
      const vue = generateSourceVueUsageCode(options);

      return (
        <>
          <p className={`${shared.p} ${shared.prose}`}>
            Vue treats unknown tags as Vue components. Merge the matching <code>isCustomElement</code> option into your
            existing config, keeping its other plugins and aliases.
          </p>
          <CodeTabs
            label="Vue toolchain"
            tabs={[
              {
                code: vue[installationVueConfigFilename(template)],
                label: project.config!,
                lang: 'ts',
                value: 'config',
              },
            ]}
          />
        </>
      );
    }

    if (projectFramework === 'svelte') {
      return (
        <p className={`${shared.p} ${shared.prose}`}>
          Svelte passes hyphenated custom-element tags to the browser, so it does not need compiler configuration. The
          imports in the next step register the player, media, and installed skin.
        </p>
      );
    }

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
              tabs={[{ code: block.code, label: block.filename, lang: block.language, value: 'entry' }]}
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

  if (projectFramework === 'vue') {
    const vue = generateSourceVueUsageCode(options);

    return (
      <>
        <p className={`${shared.p} ${shared.prose}`}>
          Import the player, skin registration, and updated local skin HTML in a Vue component, then render it in your
          app. Loading the HTML as raw text keeps the skin's internal templates intact. Nuxt uses a client-only
          component so hydration does not replace the player markup.
        </p>
        <CodeTabs
          label="Vue component"
          tabs={[
            {
              code: vue['MediaPlayer.vue'],
              label: project.player,
              lang: 'html',
              value: 'player',
            },
          ]}
        />
        <CodeTabs
          label="Vue usage"
          tabs={[{ code: vue['App.vue'], label: project.usage!, lang: 'html', value: 'app' }]}
        />
      </>
    );
  }

  if (projectFramework === 'svelte') {
    const svelte = generateSourceSvelteUsageCode(options);

    return (
      <>
        <p className={`${shared.p} ${shared.prose}`}>
          Import the player, skin registration, and updated local skin HTML in a Svelte component, then render it from
          SvelteKit or a Vite app. Loading the HTML as raw text keeps the skin's browser-native markup intact.
        </p>
        <CodeTabs
          label="Svelte component"
          tabs={[
            {
              code: svelte['VideoPlayer.svelte'],
              label: project.player,
              lang: 'html',
              value: 'player',
            },
          ]}
        />
        <CodeTabs
          label="Svelte app"
          tabs={[
            {
              code: template === 'sveltekit' ? svelte['+page.svelte'] : svelte['App.svelte'],
              label: project.usage!,
              lang: 'html',
              value: 'usage',
            },
          ]}
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
