import * as p from '@clack/prompts';
import { validateInstallationOptions } from '@/utils/installation/codegen';
import type { InstallMethod, Renderer, UseCase } from '@/utils/installation/types';
import type { Framework } from '../utils/config.js';
import { getConfigValue } from '../utils/config.js';
import { docExistsInAnyFramework, readBundledDoc, readLlmsTxt } from '../utils/docs.js';
import { formatInstallationCode } from '../utils/format.js';
import { mapRawSkin, type PartialInstallFlags, promptFramework, promptInstallOptions } from '../utils/prompts.js';
import { replaceMarker } from '../utils/replace.js';

interface ParsedFlags {
  framework?: string;
  list?: boolean;
  help?: boolean;
  preset?: string;
  skin?: string;
  media?: string;
  'source-url'?: string;
  'install-method'?: string;
}

function printVersionHeader(): void {
  console.log(`@videojs/cli v${__CLI_VERSION__}\n`);
}

async function resolveFramework(flags: ParsedFlags): Promise<Framework> {
  if (flags.framework === 'html' || flags.framework === 'react') {
    return flags.framework;
  }
  if (flags.framework) {
    console.error(`Invalid framework: "${flags.framework}". Must be "html" or "react".`);
    process.exit(1);
  }

  const saved = getConfigValue('framework');
  if (saved === 'html' || saved === 'react') return saved;

  return promptFramework();
}

function mapPresetToUseCase(preset: string): UseCase {
  const map: Record<string, UseCase> = {
    video: 'default-video',
    audio: 'default-audio',
    'background-video': 'background-video',
  };
  const result = map[preset];
  if (!result) {
    console.error(`Invalid preset: "${preset}". Must be "video", "audio", or "background-video".`);
    process.exit(1);
  }
  return result;
}

const ALL_RENDERERS: Renderer[] = ['html5-video', 'html5-audio', 'hls', 'background-video'];

function validateMedia(media: string): Renderer {
  if (!ALL_RENDERERS.includes(media as Renderer)) {
    console.error(`Invalid media type: "${media}". Valid options: ${ALL_RENDERERS.join(', ')}`);
    process.exit(1);
  }
  return media as Renderer;
}

function validateInstallMethod(method: string, framework: Framework): InstallMethod {
  const valid = framework === 'html' ? ['cdn', 'npm', 'pnpm', 'yarn', 'bun'] : ['npm', 'pnpm', 'yarn', 'bun'];
  if (!valid.includes(method)) {
    console.error(`Invalid install method: "${method}". Valid options: ${valid.join(', ')}`);
    process.exit(1);
  }
  return method as InstallMethod;
}

function buildPartialFlags(flags: ParsedFlags, framework: Framework): PartialInstallFlags {
  const partial: PartialInstallFlags = {};

  if (flags.preset) {
    partial.preset = mapPresetToUseCase(flags.preset);
  }

  if (flags.skin) {
    if (partial.preset) {
      partial.skin = mapRawSkin(flags.skin, partial.preset);
    } else {
      partial.rawSkin = flags.skin;
    }
  }

  if (flags['source-url'] !== undefined) {
    partial.sourceUrl = flags['source-url'];
  }

  if (flags.media) {
    partial.media = validateMedia(flags.media);
  }

  if (flags['install-method'] !== undefined) {
    partial.installMethod = validateInstallMethod(flags['install-method'], framework);
  }

  return partial;
}

const DOCS_HELP = `Usage: @videojs/cli docs <slug> [--framework <html|react>]
       @videojs/cli docs --list [--framework <html|react>]

Installation flags (for docs how-to/installation):
  --preset <video|audio|background-video>
  --skin <default|minimal>
  --source-url <url>
  --media <html5-video|html5-audio|hls|background-video>
  --install-method <cdn|npm|pnpm|yarn|bun>`;

export async function handleDocs(flags: ParsedFlags, positionals: string[]): Promise<void> {
  if (flags.help) {
    console.log(DOCS_HELP);
    process.exit(0);
  }

  // --list: print llms.txt
  if (flags.list) {
    const framework = await resolveFramework(flags);
    const content = readLlmsTxt(framework);
    if (!content) {
      console.error(`No documentation index found for framework "${framework}".`);
      process.exit(1);
    }
    console.log(content);
    return;
  }

  const slug = positionals[0];
  if (!slug) {
    console.error(DOCS_HELP);
    process.exit(1);
  }

  // Bail early if the doc doesn't exist in either framework
  if (!docExistsInAnyFramework(slug)) {
    console.error(`Doc not found: "${slug}".`);
    console.error('Run `@videojs/cli docs --list` to see available pages.');
    process.exit(1);
  }

  const framework = await resolveFramework(flags);
  const markdown = readBundledDoc(framework, slug);

  if (!markdown) {
    console.error(`Doc not found: "${slug}" for framework "${framework}".`);
    console.error('Run `@videojs/cli docs --list` to see available pages.');
    process.exit(1);
  }

  // Installation page: generate code and replace markers
  if (slug === 'how-to/installation') {
    const partial = buildPartialFlags(flags, framework);
    const needsPrompting =
      !partial.preset ||
      (!partial.skin && !partial.rawSkin) ||
      partial.sourceUrl === undefined ||
      !partial.media ||
      !partial.installMethod;

    if (needsPrompting) {
      p.intro('Video.js Installation');
    }

    const opts = await promptInstallOptions(framework, partial);

    if (needsPrompting) {
      p.outro('');
    }

    const validation = validateInstallationOptions(opts);
    if (!validation.valid) {
      console.error(`Error: ${validation.reason}`);
      process.exit(1);
    }

    const generated = formatInstallationCode(opts);
    const output = replaceMarker(markdown, 'installation', generated);
    printVersionHeader();
    console.log(output);
    return;
  }

  // Regular doc: print as-is
  printVersionHeader();
  console.log(markdown);
}
