import { rendererSupportsCdn } from './cdn-code';
import { CDN_MEDIA_SUBPATHS, cdnBaseForVersion } from './defaults';
import {
  defaultRegistryStyling,
  defaultRegistryTemplate,
  registryStylings,
  registryTemplates,
  type RegistryFramework,
  type RegistryStyling,
  type RegistryTemplate,
} from './shadcn';
import {
  getInstallationPreset,
  INSTALLATION_PRESETS,
  INSTALLATION_SKIN_FLAGS,
  RENDERERS,
  USE_CASES,
  type Renderer,
  type Skin,
  type UseCase,
} from './types';

export const INSTALLATION_METHODS = ['packaged', 'shadcn', 'cdn'] as const;
export type InstallationMethod = (typeof INSTALLATION_METHODS)[number];

export const INSTALLATION_FRAMEWORKS = ['react', 'html', 'vue', 'svelte'] as const;
export type InstallationFramework = (typeof INSTALLATION_FRAMEWORKS)[number];

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export type PlayerOwner = 'html' | 'react';
export type PresetFlag = (typeof INSTALLATION_PRESETS)[UseCase]['flag'];
export type SkinFlag = (typeof INSTALLATION_SKIN_FLAGS)[number];

export interface InstallationInput {
  method?: string;
  framework?: string;
  preset?: string;
  skin?: string;
  media?: string;
  sourceUrl?: string;
  packageManager?: string;
  template?: string;
  styling?: string;
}

export interface InstallationSelection {
  owner: PlayerOwner;
  method: InstallationMethod;
  framework: InstallationFramework;
  sourceFramework: RegistryFramework;
  useCase: UseCase;
  preset: PresetFlag;
  skin: Skin;
  skinFlag: SkinFlag;
  media: Renderer;
  sourceUrl: string;
  packageManager: PackageManager;
  template: RegistryTemplate | null;
  styling: RegistryStyling | null;
  cdnBase: string;
  defaulted: readonly InstallationInputKey[];
}

export type InstallationInputKey = keyof InstallationInput;

export interface SelectionError {
  field: InstallationInputKey;
  message: string;
  value?: string;
}

export type SelectionResult =
  | { ok: true; selection: InstallationSelection }
  | { ok: false; errors: readonly SelectionError[] };

function includes<const Values extends readonly string[]>(values: Values, value: string): value is Values[number] {
  return values.includes(value);
}

export function useCaseFromPreset(preset: string): UseCase | undefined {
  return USE_CASES.find((useCase) => INSTALLATION_PRESETS[useCase].flag === preset);
}

export function skinFromFlag(flag: SkinFlag, useCase: UseCase): Skin {
  if (flag === 'none') return 'none';

  const suffix = getInstallationPreset(useCase).mediaType;

  return flag === 'minimal' ? `minimal-${suffix}` : suffix;
}

export function sourceFrameworkFor(framework: InstallationFramework): RegistryFramework {
  return framework === 'react' ? 'react' : 'html';
}

export function resolveInstallationSelection(
  owner: PlayerOwner,
  input: InstallationInput,
  packageVersion = 'latest'
): SelectionResult {
  const errors: SelectionError[] = [];
  const defaulted: InstallationInputKey[] = [];
  const defaultValue = <Key extends InstallationInputKey>(key: Key, value: NonNullable<InstallationInput[Key]>) => {
    if (input[key] === undefined) defaulted.push(key);

    return input[key] ?? value;
  };

  const methodValue = defaultValue('method', 'packaged');
  const method = includes(INSTALLATION_METHODS, methodValue) ? methodValue : 'packaged';

  if (method !== methodValue) {
    errors.push({
      field: 'method',
      value: methodValue,
      message: `Expected one of: ${INSTALLATION_METHODS.join(', ')}`,
    });
  }

  const defaultFramework = owner === 'react' ? 'react' : 'html';
  const frameworkValue = defaultValue('framework', defaultFramework);
  const framework = includes(INSTALLATION_FRAMEWORKS, frameworkValue) ? frameworkValue : defaultFramework;

  if (framework !== frameworkValue) {
    errors.push({
      field: 'framework',
      value: frameworkValue,
      message: `Expected one of: ${INSTALLATION_FRAMEWORKS.join(', ')}`,
    });
  }

  if (owner === 'react' && framework !== 'react') {
    errors.push({
      field: 'framework',
      value: framework,
      message: '`@videojs/react` supports the React framework. Use `@videojs/html` for HTML, Vue, or Svelte.',
    });
  } else if (owner === 'html' && framework === 'react') {
    errors.push({
      field: 'framework',
      value: framework,
      message: '`@videojs/html` supports HTML, Vue, or Svelte. Use `@videojs/react` for React.',
    });
  }

  const presetValue = defaultValue('preset', 'video');
  const useCase = useCaseFromPreset(presetValue) ?? 'default-video';

  if (!useCaseFromPreset(presetValue)) {
    const presets = Object.values(INSTALLATION_PRESETS).map(({ flag }) => flag);

    errors.push({ field: 'preset', value: presetValue, message: `Expected one of: ${presets.join(', ')}` });
  }

  const preset = INSTALLATION_PRESETS[useCase].flag;

  const skinValue = defaultValue('skin', 'default');
  const skinFlag = includes(INSTALLATION_SKIN_FLAGS, skinValue) ? skinValue : 'default';

  if (skinFlag !== skinValue) {
    errors.push({
      field: 'skin',
      value: skinValue,
      message: `Expected one of: ${INSTALLATION_SKIN_FLAGS.join(', ')}`,
    });
  }

  const skin = skinFromFlag(skinFlag, useCase);

  const availableMedia = getInstallationPreset(useCase).renderers;
  const mediaValue = defaultValue('media', availableMedia[0]!);
  const media = includes(RENDERERS, mediaValue) ? mediaValue : availableMedia[0]!;

  if (!includes(RENDERERS, mediaValue)) {
    errors.push({ field: 'media', value: mediaValue, message: `Unknown media source: ${mediaValue}` });
  } else if (!availableMedia.includes(mediaValue)) {
    errors.push({
      field: 'media',
      value: mediaValue,
      message: `${mediaValue} is not available for the ${preset} preset. Expected one of: ${availableMedia.join(', ')}`,
    });
  }

  const packageManagerValue = defaultValue('packageManager', 'npm');
  const packageManager = includes(PACKAGE_MANAGERS, packageManagerValue) ? packageManagerValue : 'npm';

  if (packageManager !== packageManagerValue) {
    errors.push({
      field: 'packageManager',
      value: packageManagerValue,
      message: `Expected one of: ${PACKAGE_MANAGERS.join(', ')}`,
    });
  }

  const sourceUrl = input.sourceUrl?.trim() ?? '';

  if (!sourceUrl) defaulted.push('sourceUrl');

  const sourceFramework = sourceFrameworkFor(framework);
  let template: RegistryTemplate | null = null;
  let styling: RegistryStyling | null = null;

  if (method === 'cdn') {
    if (owner !== 'html' || framework !== 'html') {
      errors.push({ field: 'method', value: method, message: 'CDN installation is available for plain HTML.' });
    }

    if (input.packageManager !== undefined) {
      errors.push({ field: 'packageManager', message: '--package-manager does not apply to CDN installation.' });
    }

    if (!rendererSupportsCdn(media, CDN_MEDIA_SUBPATHS)) {
      errors.push({ field: 'media', value: media, message: `${media} is not published by @videojs/cdn.` });
    }
  }

  if (method === 'shadcn') {
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
        message: 'Shadcn installs editable skin source, so --skin none is not available.',
      });
    }

    const templateValue = defaultValue('template', defaultRegistryTemplate(framework));

    if (includes(registryTemplates(sourceFramework), templateValue)) template = templateValue;
    else {
      errors.push({
        field: 'template',
        value: templateValue,
        message: `Expected one of: ${registryTemplates(sourceFramework).join(', ')}`,
      });
      template = defaultRegistryTemplate(framework);
    }

    const stylingValue = defaultValue('styling', defaultRegistryStyling(sourceFramework));

    if (includes(registryStylings(sourceFramework), stylingValue)) styling = stylingValue;
    else {
      errors.push({
        field: 'styling',
        value: stylingValue,
        message: `Expected one of: ${registryStylings(sourceFramework).join(', ')}`,
      });
      styling = defaultRegistryStyling(sourceFramework);
    }
  } else {
    if (input.template !== undefined) {
      errors.push({ field: 'template', message: '--template only applies to Shadcn installation.' });
    }

    if (input.styling !== undefined) {
      errors.push({ field: 'styling', message: '--styling only applies to Shadcn installation.' });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    selection: {
      owner,
      method,
      framework,
      sourceFramework,
      useCase,
      preset,
      skin,
      skinFlag,
      media,
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
    preset: selection.preset,
    skin: selection.skinFlag,
    media: selection.media,
    sourceUrl: selection.sourceUrl,
    packageManager: selection.packageManager,
    template: selection.template ?? '',
    styling: selection.styling ?? '',
  };
}
