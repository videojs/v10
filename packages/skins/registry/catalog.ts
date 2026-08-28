import type { ShadcnAuthoredItem } from 'vjsc/shadcn';

import type { VideojsRegistryMeta } from './meta.ts';

const frameworks = ['react', 'html'] as const;
const presets = ['video', 'audio', 'live-video', 'live-audio'] as const;
const variants = ['default', 'minimal'] as const;
const stylingOptions = ['tailwind', 'css'] as const;
const mediaEntries = [
  'background-video',
  'cloudflare-video',
  'dash-video',
  'google-cast',
  'hls-audio',
  'hls-background-video',
  'hls-video',
  'hlsjs-video',
  'mux-audio',
  'mux-audio/hls-js',
  'mux-audio/spf',
  'mux-data',
  'mux-video',
  'mux-video/hls-js',
  'mux-video/spf',
  'native-hls-video',
  'shaka-video',
  'spotify-audio',
  'tiktok-video',
  'twitch-video',
  'vimeo-video',
  'wistia-video',
  'youtube-video',
] as const;

/** Source-owned Player compositions and exact package media facades. */
export function registryCatalog(): readonly ShadcnAuthoredItem[] {
  return [...playerItems(), ...mediaItems()];
}

function playerItems(): ShadcnAuthoredItem[] {
  return frameworks.flatMap((framework) =>
    presets.flatMap((preset) =>
      variants.flatMap((variant) =>
        stylingOptions.map((styling) => {
          const suffix = itemSuffix(variant, styling);
          const name = `${framework}-${preset}${suffix}`;
          const skin = `${framework}-${preset}-skin${suffix}`;
          const media = preset.endsWith('audio') ? 'audio' : 'video';
          const extension = framework === 'react' ? 'tsx' : 'html';
          const meta = {
            role: 'player',
            framework,
            styling,
            preset,
            media,
            variant,
            public: true,
          } satisfies VideojsRegistryMeta;

          return {
            name,
            group: `${framework}/players`,
            type: 'registry:block',
            title: `${titleCase(variant)} ${titleCase(preset)} Player`,
            description: `A ${variant} ${preset} Player shell with editable ${styling} skin source and a media child slot.`,
            dependencies: [`@videojs/${framework}`, ...(framework === 'react' ? ['react'] : [])],
            registryDependencies: [`@videojs/${skin}`],
            files: [
              {
                content:
                  framework === 'react'
                    ? reactPlayerSource(preset, variant, suffix)
                    : htmlPlayerSource(preset, variant, suffix),
                target: `players/${preset}${suffix}.${extension}`,
                type: framework === 'react' ? 'registry:component' : 'registry:file',
              },
            ],
            meta,
          } satisfies ShadcnAuthoredItem;
        })
      )
    )
  );
}

function mediaItems(): ShadcnAuthoredItem[] {
  return frameworks.flatMap((framework) =>
    mediaEntries.map((entry) => {
      const name = entry.replace('/', '-');
      const meta = {
        role: 'media',
        framework,
        media: mediaType(entry),
        public: true,
      } satisfies VideojsRegistryMeta;

      return {
        name: `${framework}-${name}`,
        group: `${framework}/media`,
        type: 'registry:component',
        title: `${titleCase(name)} Media`,
        description: `A direct typed facade over the ${framework} ${entry} package entry.`,
        dependencies: [`@videojs/${framework}`],
        files: [
          {
            content: `export * from '@videojs/${framework}/media/${entry}';\n`,
            target: `media/${name}.ts`,
            type: 'registry:component',
          },
        ],
        meta,
      } satisfies ShadcnAuthoredItem;
    })
  );
}

function reactPlayerSource(
  preset: (typeof presets)[number],
  variant: (typeof variants)[number],
  suffix: string
): string {
  const component = pascalCase(preset);
  const player = `${component}Player`;
  const skin = `${variant === 'minimal' ? 'Minimal' : 'Default'}${component}Skin`;

  return `'use client';

import { ${player}, type ${player}Props } from '@videojs/react/${preset}';

import { ${skin} } from '../skins/${preset}${suffix}/skin';

export interface ${component}Props extends ${player}Props {}

export function ${component}({ children, ...props }: ${component}Props) {
  return (
    <${player} {...props}>
      <${skin}>{children}</${skin}>
    </${player}>
  );
}
`;
}

function htmlPlayerSource(
  preset: (typeof presets)[number],
  variant: (typeof variants)[number],
  suffix: string
): string {
  const skinTag = `${preset}-${variant === 'minimal' ? 'minimal-' : ''}skin`;

  return `<script type="module">
  import '@videojs/html/${preset}/player';
  import '../skins/${preset}${suffix}/skin';
</script>

<${preset}-player>
  <${skinTag}>
    <!-- Add a compatible media element here. -->
  </${skinTag}>
</${preset}-player>
`;
}

function mediaType(entry: string): VideojsRegistryMeta['media'] {
  return entry.includes('audio') || entry === 'spotify-audio' ? 'audio' : 'video';
}

function itemSuffix(variant: (typeof variants)[number], styling: (typeof stylingOptions)[number]): string {
  return `${variant === 'minimal' ? '-minimal' : ''}${styling === 'css' ? '-css' : ''}`;
}

function pascalCase(value: string): string {
  return value.replace(/(?:^|-)([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
