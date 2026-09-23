import { rendererSupportsCdn } from './cdn-code';
import { CDN_MEDIA_SUBPATHS, cdnBaseForVersion } from './defaults';
import { PACKAGE_MANAGERS, type InstallationInput, type InstallationInputKey, type PackageManager } from './parameters';
export { PACKAGE_MANAGERS, type PackageManager } from './parameters';
import {
  getInstallationPreset,
  INSTALLATION_PRESETS,
  INSTALLATION_SKIN_FLAGS,
  USE_CASES,
  type Skin,
  type UseCase,
} from './presets';
import { RENDERERS, type Renderer } from './renderers';
import {
  defaultRegistryStyling,
  defaultRegistryTemplate,
  registryStylings,
  registryTemplates,
  type RegistryFramework,
  type RegistryStyling,
  type RegistryTemplate,
} from './shadcn';

export const INSTALLATION_METHODS = ['packaged', 'shadcn', 'cdn'] as const;
export type InstallationMethod = (typeof INSTALLATION_METHODS)[number];

export const INSTALLATION_FRAMEWORKS = ['react', 'html', 'vue', 'svelte'] as const;
export type InstallationFramework = (typeof INSTALLATION_FRAMEWORKS)[number];

export type InstallMethod = 'cdn' | PackageManager;

const INSTALLATION_METHODS_BY_FRAMEWORK = {
  react: ['packaged', 'shadcn'],
  html: ['packaged', 'shadcn', 'cdn'],
  vue: ['packaged', 'shadcn'],
  svelte: ['packaged', 'shadcn'],
} as const satisfies Record<InstallationFramework, readonly InstallationMethod[]>;

export type PlayerOwner = 'html' | 'react';
export type PresetFlag = (typeof INSTALLATION_PRESETS)[UseCase]['flag'];
export type SkinFlag = (typeof INSTALLATION_SKIN_FLAGS)[number];

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

export function isInstallationFramework(value: string | null | undefined): value is InstallationFramework {
  return value != null && includes(INSTALLATION_FRAMEWORKS, value);
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
  packageVersion = 'latest'
): SelectionResult {
  const errors: SelectionError[] = [];
  const defaulted: InstallationInputKey[] = [];
  const defaultValue = <Key extends InstallationInputKey>(key: Key, value: NonNullable<InstallationInput[Key]>) => {
    if (input[key] === undefined) defaulted.push(key);

    return input[key] ?? value;
  };

  const methodValue = defaultValue('method', 'packaged');
  const method = resolveChoice('method', methodValue, INSTALLATION_METHODS, 'packaged', errors);

  const defaultFramework = owner === 'react' ? 'react' : 'html';
  const frameworkValue = defaultValue('framework', defaultFramework);
  const framework = resolveChoice('framework', frameworkValue, INSTALLATION_FRAMEWORKS, defaultFramework, errors);

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

  const availableMedia = getInstallationPreset(useCase).renderers;
  const mediaValue = defaultValue('media', availableMedia[0]!);
  const media = resolveChoice('media', mediaValue, RENDERERS, availableMedia[0]!, errors);

  if (includes(RENDERERS, mediaValue) && !availableMedia.includes(mediaValue)) {
    errors.push({
      field: 'media',
      value: mediaValue,
      message: `Not available for the ${preset} preset. Expected one of: ${availableMedia.join(', ')}`,
    });
  }

  const packageManagerValue = defaultValue('packageManager', 'npm');
  const packageManager = resolveChoice('packageManager', packageManagerValue, PACKAGE_MANAGERS, 'npm', errors);

  const sourceUrl = input.sourceUrl?.trim() ?? '';

  if (!sourceUrl) defaulted.push('sourceUrl');
  else if (containsControlCharacter(sourceUrl)) {
    errors.push({
      field: 'sourceUrl',
      value: sourceUrl,
      message: 'Must not contain control characters or line breaks.',
    });
  }

  const sourceFramework = sourceFrameworkFor(framework);
  let template: RegistryTemplate | null = null;
  let styling: RegistryStyling | null = null;

  if (method === 'cdn') {
    if (owner !== 'html' || framework !== 'html') {
      errors.push({ field: 'method', value: method, message: 'CDN installation is available for plain HTML.' });
    }

    if (input.packageManager !== undefined) {
      errors.push({ field: 'packageManager', message: 'does not apply to CDN installation.' });
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
        message: 'Shadcn installs editable skin source, so the `none` skin is not available.',
      });
    }

    const templateValue = defaultValue('template', defaultRegistryTemplate(framework));
    const templates = registryTemplates(sourceFramework);

    template = resolveChoice('template', templateValue, templates, defaultRegistryTemplate(framework), errors);

    const stylingValue = defaultValue('styling', defaultRegistryStyling(sourceFramework));
    const stylings = registryStylings(sourceFramework);

    styling = resolveChoice('styling', stylingValue, stylings, defaultRegistryStyling(sourceFramework), errors);
  } else {
    if (input.template !== undefined) {
      errors.push({ field: 'template', message: 'only applies to Shadcn installation.' });
    }

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
