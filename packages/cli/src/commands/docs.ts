import * as p from '@clack/prompts';
import { getPresetLabel } from '@/utils/installation/cdn-code';
import { validateInstallationOptions } from '@/utils/installation/codegen';
import { RENDERER_LABELS } from '@/utils/installation/renderer-options';
import { type InstallMethod, type Renderer, type UseCase, VALID_RENDERERS } from '@/utils/installation/types';
import type { Framework } from '../utils/config.js';
import { getConfigValue } from '../utils/config.js';
import { docExistsInAnyFramework, readBundledDoc, readLlmsTxt } from '../utils/docs.js';
import { formatInstallationCode } from '../utils/format.js';
import {
  cdnUnsupportedReason,
  mapRawSkin,
  type PartialInstallFlags,
  promptFramework,
  promptInstallOptions,
} from '../utils/prompts.js';
import { replaceMarker, stripOmitMarkers } from '../utils/replace.js';

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

const PRESET_FLAGS: Record<string, UseCase> = {
  video: 'default-video',
  audio: 'default-audio',
  'live-video': 'live-video',
  'live-audio': 'live-audio',
  'background-video': 'background-video',
};

function mapPresetToUseCase(preset: string): UseCase {
  const result = PRESET_FLAGS[preset];
  if (!result) {
    const valid = Object.keys(PRESET_FLAGS)
      .map((name) => `"${name}"`)
      .join(', ');
    console.error(`Invalid preset: "${preset}". Valid options: ${valid}`);
    process.exit(1);
  }
  return result;
}

const ALL_RENDERERS = Object.keys(RENDERER_LABELS) as Renderer[];

function validateMedia(media: string): Renderer {
  if (!ALL_RENDERERS.includes(media as Renderer)) {
    console.error(`Invalid media type: "${media}". Valid options: ${ALL_RENDERERS.join(', ')}`);
    process.exit(1);
  }
  return media as Renderer;
}

function presetFlagFor(useCase: UseCase): string {
  return Object.keys(PRESET_FLAGS).find((flag) => PRESET_FLAGS[flag] === useCase) ?? useCase;
}

// The interactive prompt only offers renderers valid for the chosen preset, and
// the install page's dropdown does the same. Enforce it on the flag path too so
// `--preset live-audio --media html5-video` can't generate a "live" player
// pointed at a progressive file.
function validateMediaForUseCase(renderer: Renderer, useCase: UseCase): void {
  const valid = VALID_RENDERERS[useCase];
  if (!valid.includes(renderer)) {
    console.error(
      `Invalid media type "${renderer}" for the "${presetFlagFor(useCase)}" preset. Valid options: ${valid.join(', ')}`
    );
    process.exit(1);
  }
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
  --preset <video|audio|live-video|live-audio|background-video>
  --skin <default|minimal|none>
  --source-url <url>
  --media <html5-video|html5-audio|hls|dash|mux-video|mux-audio|vimeo|background-video>
  --install-method <cdn|npm|pnpm|yarn|bun>

The live presets accept streaming media only: hls, dash, or mux-video for
live-video, and mux-audio for live-audio.`;

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

    // Only ever fires for a `--media` flag; prompted values come from the
    // per-preset option list and are valid by construction.
    validateMediaForUseCase(opts.renderer, opts.useCase);

    const validation = validateInstallationOptions(opts);
    if (!validation.valid) {
      console.error(`Error: ${validation.reason}`);
      process.exit(1);
    }

    // The interactive prompt hides CDN when either the preset or the renderer
    // lacks a CDN build; guard the non-interactive flag path so a
    // `--install-method cdn` request for one can't emit a broken snippet.
    if (opts.installMethod === 'cdn') {
      const reason = cdnUnsupportedReason(opts.useCase, opts.skin, opts.renderer);
      if (reason !== null) {
        const subject =
          reason === 'preset'
            ? `The ${getPresetLabel(opts.useCase, opts.skin)} player`
            : RENDERER_LABELS[opts.renderer];
        console.error(`Error: ${subject} has no CDN build. Install it with npm, pnpm, yarn, or bun.`);
        process.exit(1);
      }
    }

    const generated = formatInstallationCode(opts);
    const output = stripOmitMarkers(replaceMarker(markdown, 'installation', generated));
    printVersionHeader();
    console.log(output);
    return;
  }

  // Regular doc: print as-is
  printVersionHeader();
  console.log(stripOmitMarkers(markdown));
}
