import * as p from '@clack/prompts';
import { type InstallationOptions, validateInstallationOptions } from '@/utils/installation/codegen';
import { detectRenderer } from '@/utils/installation/detect-renderer';
import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';
import { VALID_RENDERERS } from '@/utils/installation/types';
import type { Framework } from '../utils/config.js';
import { getConfigValue } from '../utils/config.js';
import { readBundledDoc, readLlmsTxt } from '../utils/docs.js';
import { formatInstallationCode } from '../utils/format.js';
import { promptAllInstallOptions, promptFramework } from '../utils/prompts.js';
import { replaceMarker } from '../utils/replace.js';

interface ParsedFlags {
  framework?: string;
  list?: boolean;
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

function mapSkinFlag(skinFlag: string, preset: string): Skin {
  const isAudio = preset === 'audio';
  const map: Record<string, Skin> = {
    default: isAudio ? 'audio' : 'video',
    minimal: isAudio ? 'minimal-audio' : 'minimal-video',
  };
  const result = map[skinFlag];
  if (!result) {
    console.error(`Invalid skin: "${skinFlag}". Must be "default" or "minimal".`);
    process.exit(1);
  }
  return result;
}

function getDefaultRenderer(useCase: UseCase): Renderer {
  return VALID_RENDERERS[useCase][0]!;
}

function getDefaultInstallMethod(framework: Framework): InstallMethod {
  return framework === 'html' ? 'cdn' : 'npm';
}

function resolveMedia(flags: ParsedFlags, useCase: UseCase): Renderer {
  if (flags.media) {
    const media = flags.media as Renderer;
    if (!VALID_RENDERERS[useCase].includes(media)) {
      console.error(
        `Media type "${media}" is not valid for preset. Valid options: ${VALID_RENDERERS[useCase].join(', ')}`
      );
      process.exit(1);
    }
    return media;
  }

  // Auto-detect from source URL
  if (flags['source-url']) {
    const detected = detectRenderer(flags['source-url'], useCase);
    if (detected) return detected.renderer;
  }

  return getDefaultRenderer(useCase);
}

async function resolveInstallationOptions(flags: ParsedFlags, framework: Framework): Promise<InstallationOptions> {
  const hasAnyInstallFlag = flags.preset || flags.skin || flags.media || flags['source-url'] || flags['install-method'];

  // --framework only: prompt for install options
  if (!hasAnyInstallFlag) {
    return promptAllInstallOptions(framework);
  }

  // --framework + install flags: defaults for the rest
  const preset = flags.preset ?? 'video';
  const useCase = mapPresetToUseCase(preset);

  return {
    framework,
    useCase,
    skin: mapSkinFlag(flags.skin ?? 'default', preset),
    renderer: resolveMedia(flags, useCase),
    sourceUrl: flags['source-url'] ?? '',
    installMethod: (flags['install-method'] ?? getDefaultInstallMethod(framework)) as InstallMethod,
  };
}

export async function handleDocs(flags: ParsedFlags, positionals: string[]): Promise<void> {
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
    console.error('Usage: @videojs/cli docs <slug> [--framework <html|react>]');
    console.error('       @videojs/cli docs --list [--framework <html|react>]');
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
    // Determine interactive mode based on whether --framework came from the flag
    const hasFrameworkFlag = flags.framework === 'html' || flags.framework === 'react';

    let opts: InstallationOptions;
    if (!hasFrameworkFlag) {
      // Zero flags (framework was prompted or from config): prompt for everything
      p.intro('Video.js Installation');
      opts = await promptAllInstallOptions(framework);
      p.outro('');
    } else {
      opts = await resolveInstallationOptions(flags, framework);
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
