import { rendererSupportsCdn } from './cdn-code';
import { CDN_MEDIA_SUBPATHS, cdnBaseForVersion } from './defaults';
import { detectRenderer, detectRendererCandidates } from './detect-renderer';
import {
  defaultInstallationExtensions,
  INSTALLATION_EXTENSIONS,
  installationExtensionsFor,
  isInstallationExtension,
  parseInstallationExtensions,
  serializeInstallationExtensions,
  type InstallationExtension,
} from './extensions';
import {
  INSTALLATION_PROJECTS,
  PACKAGE_MANAGERS,
  type InstallationInput,
  type InstallationInputKey,
  type InstallationProject,
  type PackageManager,
} from './parameters';
export { INSTALLATION_PROJECTS, PACKAGE_MANAGERS, type InstallationProject, type PackageManager } from './parameters';
import {
  getInstallationPreset,
  INSTALLATION_PRESETS,
  INSTALLATION_SKIN_FLAGS,
  USE_CASES,
  type Skin,
  type UseCase,
} from './presets';
import {
  defaultInstallationTemplate,
  INSTALLATION_FRAMEWORKS,
  installationTemplates,
  type InstallationFramework,
  type InstallationTemplate,
} from './projects';
import { RENDERERS, type Renderer } from './renderers';
import { defaultRegistryStyling, registryStylings, type RegistryFramework, type RegistryStyling } from './shadcn';

export { INSTALLATION_FRAMEWORKS, type InstallationFramework } from './projects';

export const INSTALLATION_METHODS = ['packaged', 'shadcn', 'cdn'] as const;
export type InstallationMethod = (typeof INSTALLATION_METHODS)[number];

export type InstallMethod = 'cdn' | PackageManager;

const INSTALLATION_METHODS_BY_FRAMEWORK = {
  react: ['packaged', 'shadcn'],
  html: ['packaged', 'shadcn', 'cdn'],
  vue: ['packaged'],
  svelte: ['packaged'],
} as const satisfies Record<InstallationFramework, readonly InstallationMethod[]>;

export type PlayerOwner = 'html' | 'react';
export type PresetFlag = (typeof INSTALLATION_PRESETS)[UseCase]['flag'];
export type SkinFlag = (typeof INSTALLATION_SKIN_FLAGS)[number];

export interface InstallationSelection {
  owner: PlayerOwner;
  method: InstallationMethod;
  framework: InstallationFramework;
  project: InstallationProject;
  sourceFramework: RegistryFramework;
  useCase: UseCase;
  preset: PresetFlag;
  skin: Skin;
  skinFlag: SkinFlag;
  media: Renderer;
  extensions: readonly InstallationExtension[];
  sourceUrl: string;
  packageManager: PackageManager;
  template: InstallationTemplate;
  styling: RegistryStyling | null;
  cdnBase: string;
  defaulted: readonly InstallationInputKey[];
}

export type SelectionErrorField = InstallationInputKey | 'arguments';

export interface SelectionError {
  field: SelectionErrorField;
  message: string;
  value?: string;
}

export type SelectionResult =
  | { ok: true; selection: InstallationSelection }
  | { ok: false; errors: readonly SelectionError[] };

function includes<const Values extends readonly string[]>(values: Values, value: string): value is Values[number] {
  return values.includes(value);
}

function resolveChoice<const Values extends readonly string[]>(
  field: InstallationInputKey,
  requested: string,
  values: Values,
  fallback: Values[number],
  errors: SelectionError[]
): Values[number] {
  if (includes(values, requested)) return requested;

  errors.push({ field, value: requested, message: `Expected one of: ${values.join(', ')}` });

  return fallback;
}

export function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);

    return (
      codePoint !== undefined &&
      (codePoint <= 0x1f || codePoint === 0x7f || codePoint === 0x85 || codePoint === 0x2028 || codePoint === 0x2029)
    );
  });
}

export function useCaseFromPreset(preset: string): UseCase | undefined {
  return USE_CASES.find((useCase) => INSTALLATION_PRESETS[useCase].flag === preset);
}

export function installationMethodsForFramework(framework: InstallationFramework): readonly InstallationMethod[] {
  return INSTALLATION_METHODS_BY_FRAMEWORK[framework];
}

/** App setups supported by one installation path. Shadcn needs a concrete app layout for aliases and generated files. */
export function installationTemplatesForMethod(
  framework: InstallationFramework,
  method: InstallationMethod
): readonly InstallationTemplate[] {
  const templates = installationTemplates(framework);

  if (method === 'shadcn') return templates.filter((template) => template !== 'none');

  if (method === 'cdn') return framework === 'html' ? (['vite', 'none'] as const) : [];

  return templates;
}

export function resolveInstallationTemplateForMethod(
  framework: InstallationFramework,
  template: InstallationTemplate | null,
  method: InstallationMethod
): InstallationTemplate {
  const templates = installationTemplatesForMethod(framework, method);
  const fallback = method === 'cdn' ? 'none' : defaultInstallationTemplate(framework);

  return template && includes(templates, template) ? template : fallback;
}

export function isInstallationFramework(value: string | null | undefined): value is InstallationFramework {
  return value != null && includes(INSTALLATION_FRAMEWORKS, value);
}

export function isInstallationProject(value: string | null | undefined): value is InstallationProject {
  return value != null && includes(INSTALLATION_PROJECTS, value);
}

export function isPackageManager(value: string): value is PackageManager {
  return includes(PACKAGE_MANAGERS, value);
}

export function isSkinFlag(value: string): value is SkinFlag {
  return includes(INSTALLATION_SKIN_FLAGS, value);
}

export function skinFromFlag(flag: SkinFlag, useCase: UseCase): Skin {
  if (flag === 'none') return 'none';

  const suffix = getInstallationPreset(useCase).mediaType;

  return flag === 'minimal' ? `minimal-${suffix}` : suffix;
}

export function skinToFlag(skin: Skin): SkinFlag {
  if (skin === 'none') return 'none';

  return skin.startsWith('minimal-') ? 'minimal' : 'default';
}

/** Keep a skin tier and media choice valid when the selected preset changes. */
export function fitSelectionToPreset(useCase: UseCase, skin: Skin, media: Renderer) {
  const renderers = getInstallationPreset(useCase).renderers;

  return {
    skin: skinFromFlag(skinToFlag(skin), useCase),
    media: renderers.includes(media) ? media : renderers[0]!,
  };
}

export function sourceFrameworkFor(framework: InstallationFramework): RegistryFramework {
  return framework === 'react' ? 'react' : 'html';
}

export function resolveInstallationSelection(
  owner: PlayerOwner,
  input: InstallationInput,
  packageVersion = 'latest',
  defaults: { packageManager?: PackageManager } = {}
): SelectionResult {
  const errors: SelectionError[] = [];
  const defaulted: InstallationInputKey[] = [];
  const defaultValue = <Key extends InstallationInputKey>(key: Key, value: NonNullable<InstallationInput[Key]>) => {
    if (input[key] === undefined) defaulted.push(key);

    return input[key] ?? value;
  };

  const methodValue = defaultValue('method', 'packaged');
  const ownerMethods = owner === 'react' ? (['packaged', 'shadcn'] as const) : INSTALLATION_METHODS;
  const method =
    owner === 'react' && methodValue === 'cdn'
      ? 'packaged'
      : resolveChoice('method', methodValue, ownerMethods, 'packaged', errors);

  if (owner === 'react' && methodValue === 'cdn') {
    errors.push({
      field: 'method',
      value: methodValue,
      message: 'CDN installation is available for plain HTML through `@videojs/html`.',
    });
  }

  const defaultFramework = owner === 'react' ? 'react' : 'html';
  const frameworkValue = defaultValue('framework', defaultFramework);
  const ownerFrameworks = owner === 'react' ? (['react'] as const) : (['html', 'vue', 'svelte'] as const);
  const unsupportedKnownFramework =
    includes(INSTALLATION_FRAMEWORKS, frameworkValue) && !includes(ownerFrameworks, frameworkValue);
  const framework = unsupportedKnownFramework
    ? defaultFramework
    : resolveChoice('framework', frameworkValue, ownerFrameworks, defaultFramework, errors);

  if (owner === 'react' && unsupportedKnownFramework) {
    errors.push({
      field: 'framework',
      value: frameworkValue,
      message: '`@videojs/react` supports the React framework. Use `@videojs/html` for HTML, Vue, or Svelte.',
    });
  } else if (owner === 'html' && unsupportedKnownFramework) {
    errors.push({
      field: 'framework',
      value: frameworkValue,
      message: '`@videojs/html` supports HTML, Vue, or Svelte. Use `@videojs/react` for React.',
    });
  }

  const projectValue = defaultValue('project', 'existing');
  const project = resolveChoice('project', projectValue, INSTALLATION_PROJECTS, 'existing', errors);

  const presetValue = defaultValue('preset', 'video');
  const presetFlags = Object.values(INSTALLATION_PRESETS).map(({ flag }) => flag);
  const preset = resolveChoice('preset', presetValue, presetFlags, 'video', errors);
  const requestedUseCase = useCaseFromPreset(preset);
  const useCase = requestedUseCase ?? 'default-video';

  const skinValue = useCase === 'background-video' ? 'default' : defaultValue('skin', 'default');
  const skinFlag = resolveChoice('skin', skinValue, INSTALLATION_SKIN_FLAGS, 'default', errors);

  if (useCase === 'background-video' && input.skin !== undefined) {
    errors.push({
      field: 'skin',
      value: input.skin,
      message: 'does not apply to the background-video preset, which has one purpose-built skin.',
    });
  }

  const skin = skinFromFlag(skinFlag, useCase);

  const sourceUrl = input.sourceUrl?.trim() ?? '';
  const validSourceUrl = sourceUrl && !containsControlCharacter(sourceUrl);

  if (!sourceUrl) defaulted.push('sourceUrl');
  else if (!validSourceUrl) {
    errors.push({
      field: 'sourceUrl',
      value: sourceUrl,
      message: 'Must not contain control characters or line breaks.',
    });
  }

  const availableMedia = getInstallationPreset(useCase).renderers;
  const detectedCandidates = validSourceUrl ? detectRendererCandidates(sourceUrl) : [];
  const compatibleDetectedCandidates = detectedCandidates.filter((candidate) => availableMedia.includes(candidate));
  const detectedMedia = validSourceUrl ? detectRenderer(sourceUrl, useCase)?.renderer : undefined;
  const mediaValue = defaultValue('media', detectedMedia ?? availableMedia[0]!);
  const media = resolveChoice('media', mediaValue, RENDERERS, availableMedia[0]!, errors);

  if (validSourceUrl && detectedCandidates.length > 0) {
    if (!detectedMedia) {
      errors.push({
        field: 'sourceUrl',
        value: sourceUrl,
        message: `Does not match a media source available for the ${preset} preset.`,
      });
    } else if (
      input.media !== undefined &&
      includes(RENDERERS, mediaValue) &&
      !compatibleDetectedCandidates.includes(mediaValue)
    ) {
      errors.push({
        field: 'media',
        value: mediaValue,
        message: `Does not match the supplied source URL. Expected one of: ${compatibleDetectedCandidates.join(', ')}`,
      });
    }
  }

  if (includes(RENDERERS, mediaValue) && !availableMedia.includes(mediaValue)) {
    errors.push({
      field: 'media',
      value: mediaValue,
      message: `Not available for the ${preset} preset. Expected one of: ${availableMedia.join(', ')}`,
    });
  }

  const availableExtensions = installationExtensionsFor(useCase, skin, media);
  const extensionValues =
    input.extensions === undefined
      ? defaultInstallationExtensions(media)
      : [...new Set(parseInstallationExtensions(input.extensions))];

  if (input.extensions === undefined) defaulted.push('extensions');

  const requestedExtensions = new Set<InstallationExtension>();

  for (const extension of extensionValues) {
    if (!isInstallationExtension(extension)) {
      errors.push({
        field: 'extensions',
        value: extension,
        message: 'Expected a comma-separated list containing google-cast, mux-data, or none.',
      });
    } else if (!availableExtensions.includes(extension)) {
      errors.push({
        field: 'extensions',
        value: extension,
        message: `${extension} does not apply to the selected preset, skin, and media source.`,
      });
    } else {
      requestedExtensions.add(extension);
    }
  }

  const extensions = INSTALLATION_EXTENSIONS.filter((extension) => requestedExtensions.has(extension));

  const sourceFramework = sourceFrameworkFor(framework);
  const availableTemplates = installationTemplatesForMethod(framework, method);
  const defaultTemplate = method === 'cdn' && project === 'existing' ? 'none' : defaultInstallationTemplate(framework);
  const templateValue = defaultValue('template', defaultTemplate);
  const template = resolveChoice('template', templateValue, availableTemplates, defaultTemplate, errors);

  if (template === 'none' && project === 'new') {
    errors.push({
      field: 'project',
      value: project,
      message:
        'A new project needs a named app setup. Choose a template, or use --project existing with --template none.',
    });
  }

  const defaultPackageManager = defaults.packageManager ?? 'pnpm';
  const packageManagerValue =
    method === 'cdn' && template === 'none'
      ? (input.packageManager ?? defaultPackageManager)
      : defaultValue('packageManager', defaultPackageManager);
  const packageManager = resolveChoice('packageManager', packageManagerValue, PACKAGE_MANAGERS, 'pnpm', errors);

  let styling: RegistryStyling | null = null;

  if (method === 'cdn') {
    if (framework !== 'html') {
      errors.push({
        field: 'method',
        value: method,
        message: 'CDN installation is available for plain HTML through `@videojs/html`.',
      });
    }

    if (!rendererSupportsCdn(media, CDN_MEDIA_SUBPATHS)) {
      errors.push({ field: 'media', value: media, message: `${media} is not published by @videojs/cdn.` });
    }
  }

  if (method === 'shadcn') {
    if (!installationMethodsForFramework(framework).includes('shadcn')) {
      errors.push({
        field: 'method',
        value: method,
        message:
          'Shadcn installation is available for React and plain HTML. Use packaged installation for Vue or Svelte.',
      });
    }

    if (useCase === 'background-video') {
      errors.push({
        field: 'preset',
        value: preset,
        message: 'Background Video is not available from the Shadcn registry.',
      });
    }

    if (skinFlag === 'none') {
      errors.push({
        field: 'skin',
        value: skinFlag,
        message: 'Shadcn installs editable skin source, so the `none` skin is not available.',
      });
    }

    const stylingValue = defaultValue('styling', defaultRegistryStyling(sourceFramework));
    const stylings = registryStylings(sourceFramework);

    styling = resolveChoice('styling', stylingValue, stylings, defaultRegistryStyling(sourceFramework), errors);
  } else {
    if (input.styling !== undefined) {
      errors.push({ field: 'styling', message: 'only applies to Shadcn installation.' });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    selection: {
      owner,
      method,
      framework,
      project,
      sourceFramework,
      useCase,
      preset,
      skin,
      skinFlag,
      media,
      extensions,
      sourceUrl,
      packageManager,
      template,
      styling,
      cdnBase: cdnBaseForVersion(packageVersion),
      defaulted,
    },
  };
}

export function selectionToInput(selection: InstallationSelection): Required<InstallationInput> {
  return {
    method: selection.method,
    framework: selection.framework,
    project: selection.project,
    preset: selection.preset,
    skin: selection.skinFlag,
    media: selection.media,
    extensions: serializeInstallationExtensions(selection.extensions),
    sourceUrl: selection.sourceUrl,
    packageManager: selection.packageManager,
    template: selection.template,
    styling: selection.styling ?? '',
  };
}
