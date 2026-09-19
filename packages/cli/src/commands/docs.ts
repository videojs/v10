import * as p from '@clack/prompts';

import { validateInstallationOptions } from '@/utils/installation/codegen';
import { RENDERER_LABELS } from '@/utils/installation/renderer-options';
import {
  type RegistryFramework,
  type RegistryStyling,
  REGISTRY_STYLINGS,
  REGISTRY_TEMPLATES,
  type RegistryTemplate,
  type RegistryTheme,
  REGISTRY_THEMES,
  registryStylings,
  registryTemplates,
  type ShadcnRunner,
  SHADCN_RUNNER_NAMES,
} from '@/utils/installation/shadcn';
import {
  getInstallationPreset,
  type InstallMethod as CodegenInstallMethod,
  INSTALLATION_SKIN_FLAGS,
  type Renderer,
  USE_CASES,
  type UseCase,
} from '@/utils/installation/types';

import type { Framework } from '../utils/config.js';
import { getConfigValue } from '../utils/config.js';
import { docExistsInAnyFramework, readBundledDoc, readLlmsTxt } from '../utils/docs.js';
import {
  formatCdnInstallation,
  formatInstallationCode,
  formatShadcnInstallation,
  formatSvelteInstallation,
  formatVueInstallation,
} from '../utils/format.js';
import {
  bundledInstallationDocument,
  INSTALLATION_FRAMEWORKS,
  type InstallationFramework,
  INSTALLATION_METHODS,
  type InstallationMethod,
  type InstallationTarget,
  parseInstallationSlug,
} from '../utils/installation-request.js';
import {
  mapRawSkin,
  type PartialInstallFlags,
  type PartialShadcnFlags,
  promptFramework,
  promptInstallationFramework,
  promptInstallationMethod,
  promptInstallOptions,
  promptShadcnSetup,
  supportsCdnInstall,
} from '../utils/prompts.js';
import { replaceMarker, selectMarker, stripOmitMarkers } from '../utils/replace.js';

export interface ParsedFlags {
  framework?: string;
  list?: boolean;
  help?: boolean;
  preset?: string;
  skin?: string;
  media?: string;
  'source-url'?: string;
  'install-method'?: string;
  method?: string;
  'package-manager'?: string;
  styling?: string;
  template?: string;
  theme?: string;
}

interface DocsRuntime {
  interactive?: boolean;
}

function printVersionHeader(): void {
  console.log(`@videojs/cli v${__CLI_VERSION__}\n`);
}

async function resolveFramework(flags: ParsedFlags, interactive: boolean): Promise<Framework> {
  if (flags.framework === 'html' || flags.framework === 'react') {
    return flags.framework;
  }

  if (flags.framework) {
    console.error(`Invalid framework: "${flags.framework}". Must be "html" or "react".`);
    process.exit(1);
  }

  const saved = getConfigValue('framework');
  if (saved === 'html' || saved === 'react') return saved;

  if (!interactive) {
    console.error('Missing framework. Pass `--framework html` or `--framework react`.');
    process.exit(1);
  }

  return promptFramework();
}

function mapPresetToUseCase(preset: string): UseCase {
  const result = USE_CASES.find((useCase) => getInstallationPreset(useCase).flag === preset);

  if (!result) {
    const valid = USE_CASES.map((useCase) => `"${getInstallationPreset(useCase).flag}"`).join(', ');

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

function validateLegacyInstallMethod(method: string): CodegenInstallMethod {
  const valid: readonly CodegenInstallMethod[] = ['cdn', 'npm', 'pnpm', 'yarn', 'bun'];

  if (!valid.some((candidate) => candidate === method)) {
    console.error(`Invalid install method: "${method}". Valid options: ${valid.join(', ')}`);
    process.exit(1);
  }

  // SAFETY: the membership check above narrows the external string to the closed install-method union.
  return method as CodegenInstallMethod;
}

function validateInstallationMethod(method: string): InstallationMethod {
  if (!INSTALLATION_METHODS.some((candidate) => candidate === method)) {
    console.error(`Invalid installation method: "${method}". Valid options: ${INSTALLATION_METHODS.join(', ')}`);
    process.exit(1);
  }

  // SAFETY: the membership check above narrows the external string to the closed method union.
  return method as InstallationMethod;
}

function validateInstallationFramework(framework: string): InstallationFramework {
  if (!INSTALLATION_FRAMEWORKS.some((candidate) => candidate === framework)) {
    console.error(
      `Invalid installation framework: "${framework}". Valid options: ${INSTALLATION_FRAMEWORKS.join(', ')}`
    );
    process.exit(1);
  }

  // SAFETY: the membership check above narrows the external string to the closed framework union.
  return framework as InstallationFramework;
}

function validatePackageManager(value: string): ShadcnRunner {
  if (!SHADCN_RUNNER_NAMES.some((candidate) => candidate === value)) {
    console.error(`Invalid package manager: "${value}". Valid options: ${SHADCN_RUNNER_NAMES.join(', ')}`);
    process.exit(1);
  }

  // SAFETY: the membership check above narrows the external string to the shared package-manager union.
  return value as ShadcnRunner;
}

function buildPartialFlags(
  flags: ParsedFlags,
  installMethod: CodegenInstallMethod | undefined,
  rawSkin = flags.skin
): PartialInstallFlags {
  const partial: PartialInstallFlags = {};

  if (flags.preset) {
    partial.preset = mapPresetToUseCase(flags.preset);
  }

  if (rawSkin) {
    if (partial.preset) {
      partial.skin = mapRawSkin(rawSkin, partial.preset);
    } else {
      partial.rawSkin = rawSkin;
    }
  }

  if (flags['source-url'] !== undefined) {
    partial.sourceUrl = flags['source-url'];
  }

  if (flags.media) {
    partial.media = validateMedia(flags.media);
  }

  if (installMethod) partial.installMethod = installMethod;

  return partial;
}

function oneChoice<T extends string>(label: string, ...values: Array<T | undefined>): T | undefined {
  const choices = [...new Set(values.filter((value): value is T => value !== undefined))];

  if (choices.length > 1) {
    console.error(`Conflicting ${label}: ${choices.map((choice) => `"${choice}"`).join(' and ')}.`);
    process.exit(1);
  }

  return choices[0];
}

interface ResolvedInstallationTarget {
  framework: InstallationFramework;
  method: InstallationMethod;
  packageManager: ShadcnRunner | undefined;
}

async function resolveInstallationTarget(
  route: InstallationTarget,
  flags: ParsedFlags,
  interactive: boolean,
  beginPrompting: () => void
): Promise<ResolvedInstallationTarget> {
  const explicitMethod = flags.method ? validateInstallationMethod(flags.method) : undefined;
  const legacyInstallMethod = flags['install-method']
    ? validateLegacyInstallMethod(flags['install-method'])
    : undefined;
  const legacyMethod =
    legacyInstallMethod === 'cdn'
      ? 'cdn'
      : legacyInstallMethod && !route.method && !explicitMethod
        ? 'packaged'
        : undefined;
  let method = oneChoice('installation methods', route.method, explicitMethod, legacyMethod);

  if (!method) {
    if (!interactive) {
      console.error(INSTALLATION_DECISION_HELP);
      process.exit(1);
    }

    beginPrompting();
    method = await promptInstallationMethod();
  }

  const explicitFramework = flags.framework ? validateInstallationFramework(flags.framework) : undefined;

  if (method === 'cdn' && explicitFramework && explicitFramework !== 'html') {
    console.error('CDN installation only supports HTML. Remove `--framework` or pass `--framework html`.');
    process.exit(1);
  }

  const forcedFramework = method === 'cdn' ? 'html' : route.framework;
  let framework = oneChoice('installation frameworks', forcedFramework, explicitFramework);

  if (!framework && method !== 'cdn') {
    const saved = getConfigValue('framework');

    if (saved === 'html' || saved === 'react') framework = saved;
  }

  if (!framework) {
    if (!interactive) {
      console.error(`Missing framework for ${method} installation. Pass \`--framework\`.`);
      console.error(INSTALLATION_DECISION_HELP);
      process.exit(1);
    }

    if (method === 'cdn') throw new Error('CDN installation should resolve the HTML framework automatically');

    beginPrompting();
    framework = await promptInstallationFramework(method);
  }

  if (method === 'shadcn' && framework !== 'html' && framework !== 'react') {
    console.error('Shadcn installation supports React and HTML source. Use `--framework react` or `--framework html`.');
    process.exit(1);
  }

  const explicitPackageManager = flags['package-manager']
    ? validatePackageManager(flags['package-manager'])
    : undefined;
  const legacyPackageManager =
    legacyInstallMethod && legacyInstallMethod !== 'cdn' ? validatePackageManager(legacyInstallMethod) : undefined;
  const packageManager = oneChoice('package managers', explicitPackageManager, legacyPackageManager);

  if (method === 'cdn' && packageManager) {
    const suppliedFlags = [
      explicitPackageManager ? '`--package-manager`' : null,
      legacyPackageManager ? '`--install-method`' : null,
    ].filter((flag): flag is string => flag !== null);

    console.error(`CDN installation does not use a package manager. Remove ${suppliedFlags.join(' and ')}.`);
    process.exit(1);
  }

  return { method, framework, packageManager };
}

function validateRegistryTemplate(value: string, framework: RegistryFramework): RegistryTemplate {
  if (!REGISTRY_TEMPLATES.some((candidate) => candidate === value)) {
    console.error(`Invalid Shadcn template: "${value}". Valid options: ${REGISTRY_TEMPLATES.join(', ')}`);
    process.exit(1);
  }

  // SAFETY: the membership check above narrows the external string to the shared template union.
  const template = value as RegistryTemplate;
  const valid = registryTemplates(framework);

  if (!valid.includes(template)) {
    console.error(`Template "${template}" is not compatible with ${framework}. Valid options: ${valid.join(', ')}`);
    process.exit(1);
  }

  return template;
}

function validateRegistryStyling(value: string, framework: RegistryFramework): RegistryStyling {
  if (!REGISTRY_STYLINGS.some((candidate) => candidate === value)) {
    console.error(`Invalid Shadcn styling: "${value}". Valid options: ${REGISTRY_STYLINGS.join(', ')}`);
    process.exit(1);
  }

  // SAFETY: the membership check above narrows the external string to the shared styling union.
  const styling = value as RegistryStyling;
  const valid = registryStylings(framework);

  if (!valid.includes(styling)) {
    console.error(`Styling "${styling}" is not compatible with ${framework}. Valid options: ${valid.join(', ')}`);
    process.exit(1);
  }

  return styling;
}

function validateRegistryTheme(value: string): RegistryTheme {
  if (!REGISTRY_THEMES.some((candidate) => candidate === value)) {
    console.error(`Invalid Shadcn theme: "${value}". Valid options: ${REGISTRY_THEMES.join(', ')}`);
    process.exit(1);
  }

  // SAFETY: the membership check above narrows the external string to the shared theme union.
  return value as RegistryTheme;
}

function toRegistryFramework(framework: InstallationFramework): RegistryFramework {
  if (framework === 'html' || framework === 'react') return framework;

  throw new Error(`Unsupported Shadcn framework: ${framework}`);
}

function missingInstallationFlags(flags: ParsedFlags, target: ResolvedInstallationTarget): string[] {
  const missing: string[] = [];

  if (!flags.preset) missing.push('--preset');

  if (target.method === 'shadcn') {
    if (!flags.theme && !flags.skin) missing.push('--theme');

    if (!flags.template) missing.push('--template');

    if (!flags.styling) missing.push('--styling');
  } else if (!flags.skin) {
    missing.push('--skin');
  }

  if (!flags.media) missing.push('--media');

  if (flags['source-url'] === undefined) missing.push('--source-url');

  if (target.method !== 'cdn' && !target.packageManager) missing.push('--package-manager');

  return missing;
}

const INSTALLATION_DECISION_HELP = `Choose an installation route:
  Packaged  guides/installation/{react|html|vue|svelte}
            or --method packaged --framework <framework>
  Shadcn    guides/installation/shadcn --framework <react|html>
            or --method shadcn --framework <react|html>
  CDN       guides/installation/cdn
            or --method cdn

Package-managed routes use --package-manager <${SHADCN_RUNNER_NAMES.join('|')}>.
The older --install-method flag remains compatible. On a canonical route, it cannot change the route's installation
method; package-manager values still select its package manager.`;

const PRESET_FLAGS = USE_CASES.map((useCase) => getInstallationPreset(useCase).flag);

const DOCS_HELP = `Usage: @videojs/cli docs <slug> [--framework <html|react>]
       @videojs/cli docs --list [--framework <html|react>]

Installation routing:
  --method <${INSTALLATION_METHODS.join('|')}>
  --framework <${INSTALLATION_FRAMEWORKS.join('|')}>
  --package-manager <${SHADCN_RUNNER_NAMES.join('|')}>

Player flags:
  --preset <${PRESET_FLAGS.join('|')}>
  --skin <${INSTALLATION_SKIN_FLAGS.join('|')}>
  --source-url <url>
  --media <${ALL_RENDERERS.join('|')}>

Shadcn flags:
  --template <${REGISTRY_TEMPLATES.join('|')}>
  --styling <${REGISTRY_STYLINGS.join('|')}>
  --theme <${REGISTRY_THEMES.join('|')}>

Compatibility:
  --install-method <cdn|npm|pnpm|yarn|bun>

The live presets accept HLS or Mux video for live-video, and Mux audio for
live-audio.`;

async function handleInstallationDocs(
  route: InstallationTarget,
  flags: ParsedFlags,
  interactive: boolean
): Promise<void> {
  let prompted = false;
  const beginPrompting = () => {
    if (prompted) return;

    p.intro('Video.js Installation');
    prompted = true;
  };
  const target = await resolveInstallationTarget(route, flags, interactive, beginPrompting);

  if (target.method !== 'shadcn' && (flags.template || flags.styling || flags.theme)) {
    console.error('`--template`, `--styling`, and `--theme` only apply to Shadcn installation.');
    process.exit(1);
  }

  let theme = flags.theme ? validateRegistryTheme(flags.theme) : undefined;

  if (target.method === 'shadcn' && flags.skin) {
    const legacyTheme = validateRegistryTheme(flags.skin);

    if (theme && theme !== legacyTheme) {
      console.error(`Conflicting Shadcn themes: "${theme}" and "${legacyTheme}".`);
      process.exit(1);
    }

    theme = legacyTheme;
  }

  const missing = missingInstallationFlags(flags, target);

  if (missing.length > 0 && !interactive) {
    console.error(`Missing installation flags: ${missing.join(', ')}.`);
    console.error('Pass every listed flag in agents, automation, and CI. Use an empty `--source-url` for demo media.');
    console.error(INSTALLATION_DECISION_HELP);
    process.exit(1);
  }

  if (missing.length > 0) beginPrompting();

  const codegenFramework: Framework = target.framework === 'react' ? 'react' : 'html';
  const codegenInstallMethod: CodegenInstallMethod | undefined =
    target.method === 'cdn' ? 'cdn' : target.packageManager;
  const partial = buildPartialFlags(flags, codegenInstallMethod, target.method === 'shadcn' ? theme : flags.skin);
  const opts = await promptInstallOptions(codegenFramework, partial, {
    allowBackground: target.method !== 'shadcn',
    allowCdn: false,
    allowNoSkin: target.method !== 'shadcn',
    cdnMediaOnly: target.method === 'cdn',
    skinLabel: target.method === 'shadcn' ? 'Theme' : 'Skin',
  });

  let shadcnSetup: Awaited<ReturnType<typeof promptShadcnSetup>> | null = null;

  if (target.method === 'shadcn') {
    const registryFramework = toRegistryFramework(target.framework);
    const partialSetup: PartialShadcnFlags = {};

    if (flags.styling) partialSetup.styling = validateRegistryStyling(flags.styling, registryFramework);

    if (flags.template) partialSetup.template = validateRegistryTemplate(flags.template, registryFramework);

    shadcnSetup = await promptShadcnSetup(registryFramework, partialSetup);
  }

  if (prompted) p.outro('');

  const validation = validateInstallationOptions(opts);

  if (!validation.valid) {
    console.error(`Error: ${validation.reason}`);
    process.exit(1);
  }

  if (target.method === 'cdn' && !supportsCdnInstall(opts.renderer)) {
    console.error(
      `Error: ${RENDERER_LABELS[opts.renderer]} has no CDN build. Use a packaged or Shadcn installation instead.`
    );
    process.exit(1);
  }

  if (target.method === 'shadcn' && (opts.useCase === 'background-video' || opts.skin === 'none')) {
    console.error('Error: the Shadcn registry provides Default and Minimal video, audio, and live skin source.');
    process.exit(1);
  }

  const { docsFramework, slug } = bundledInstallationDocument(target.method, target.framework);
  const markdown = readBundledDoc(docsFramework, slug);

  if (!markdown) {
    console.error(`Installation doc not found: "${slug}" for framework "${docsFramework}".`);
    process.exit(1);
  }

  let generated: string;

  if (target.method === 'cdn') {
    generated = formatCdnInstallation(opts);
  } else if (target.method === 'shadcn') {
    if (!shadcnSetup) throw new Error('Missing Shadcn setup after resolving Shadcn installation');

    generated = formatShadcnInstallation(opts, {
      framework: toRegistryFramework(target.framework),
      runner: validatePackageManager(opts.installMethod),
      styling: shadcnSetup.styling,
      template: shadcnSetup.template,
    });
  } else if (target.framework === 'vue') {
    generated = formatVueInstallation(opts);
  } else if (target.framework === 'svelte') {
    generated = formatSvelteInstallation(opts);
  } else {
    generated = formatInstallationCode(opts);
  }

  let output = replaceMarker(markdown, 'installation', generated);

  if (target.method === 'shadcn') {
    output = selectMarker(output, 'framework', toRegistryFramework(target.framework));
  }

  output = stripOmitMarkers(output);

  printVersionHeader();
  console.log(output);
}

export async function handleDocs(flags: ParsedFlags, positionals: string[], runtime: DocsRuntime = {}): Promise<void> {
  const interactive = runtime.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);

  if (flags.help) {
    console.log(DOCS_HELP);
    process.exit(0);
  }

  // --list: print llms.txt
  if (flags.list) {
    const framework = await resolveFramework(flags, interactive);
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

  const installationRoute = parseInstallationSlug(slug);

  if (installationRoute) {
    await handleInstallationDocs(installationRoute, flags, interactive);
    return;
  }

  // Bail early if the doc doesn't exist in either framework
  if (!docExistsInAnyFramework(slug)) {
    console.error(`Doc not found: "${slug}".`);
    console.error('Run `@videojs/cli docs --list` to see available pages.');
    process.exit(1);
  }

  const framework = await resolveFramework(flags, interactive);
  const markdown = readBundledDoc(framework, slug);

  if (!markdown) {
    console.error(`Doc not found: "${slug}" for framework "${framework}".`);
    console.error('Run `@videojs/cli docs --list` to see available pages.');
    process.exit(1);
  }

  // Regular doc: print as-is
  printVersionHeader();
  console.log(stripOmitMarkers(markdown));
}
