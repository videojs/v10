import {
  containsControlCharacter,
  defaultInstallationExtensions,
  fitSelectionToPreset,
  getInstallationPreset,
  INSTALLATION_EXTENSIONS,
  INSTALLATION_PRESETS,
  isInstallationFramework,
  isInstallationProject,
  isInstallationTemplate,
  isInstallationExtension,
  isPackageManager,
  isSkinFlag,
  resolveInstallationTemplate,
  resolveInstallationTemplateForMethod,
  installationExtensionsFor,
  parseInstallationExtensions,
  serializeInstallationExtensions,
  skinFromFlag,
  skinToFlag,
  sourceFrameworkFor,
  useCaseFromPreset,
  type InstallMethod,
  type InstallationFramework,
  type InstallationProject,
  type InstallationTemplate,
  type InstallationExtension,
  type Renderer,
  type Skin,
  type UseCase,
} from '@videojs/installation';

import type { InstallationRouteSegment } from './routes';

/**
 * The installation choices encoded in the page URL. `package-manager` controls app setup and development commands
 * whenever the selected path uses them.
 */
export interface InstallationUiSelection {
  framework: InstallationFramework;
  template: InstallationTemplate;
  project: InstallationProject;
  useCase: UseCase;
  skin: Skin;
  renderer: Renderer;
  extensions: readonly InstallationExtension[];
  sourceUrl: string;
  installMethod: InstallMethod;
}

export const DEFAULT_SELECTION: InstallationUiSelection = {
  framework: 'react',
  template: 'next',
  project: 'existing',
  useCase: 'default-video',
  skin: 'video',
  renderer: 'html5-video',
  extensions: [],
  sourceUrl: '',
  installMethod: 'pnpm',
};

function isInstallMethod(value: string): value is InstallMethod {
  return value === 'cdn' || isPackageManager(value);
}

/** Fit URL-backed picks to constraints imposed by a dedicated installation route. */
export function normalizeInstallationSelectionForRoute(
  route: string,
  selection: InstallationUiSelection
): InstallationUiSelection {
  const framework = isInstallationFramework(route)
    ? route
    : route === 'cdn'
      ? 'html'
      : route === 'shadcn'
        ? sourceFrameworkFor(selection.framework)
        : selection.framework;
  let normalized = {
    ...selection,
    framework,
    template:
      route === 'cdn'
        ? resolveInstallationTemplateForMethod('html', selection.template, 'cdn')
        : resolveInstallationTemplate(framework, selection.template),
    installMethod: selection.installMethod === 'cdn' ? ('pnpm' as const) : selection.installMethod,
  };

  if (route === 'cdn' || normalized.template === 'none') normalized.project = 'existing';

  if (route === 'shadcn') {
    normalized.template = resolveInstallationTemplateForMethod(framework, normalized.template, 'shadcn');

    const useCase = normalized.useCase === 'background-video' ? 'default-video' : normalized.useCase;
    const selectedSkin = normalized.skin === 'none' ? skinFromFlag('default', useCase) : normalized.skin;
    const fitted = fitSelectionToPreset(useCase, selectedSkin, normalized.renderer);

    normalized = { ...normalized, useCase, skin: fitted.skin, renderer: fitted.media };
  }

  const availableExtensions = installationExtensionsFor(normalized.useCase, normalized.skin, normalized.renderer);

  normalized.extensions = normalized.extensions.filter((extension) => availableExtensions.includes(extension));

  return normalized;
}

/**
 * Read the selection encoded in a query string. Unknown or invalid values fall back to the default, and a media pick
 * that the chosen preset cannot play is dropped, matching what the pickers would do on screen.
 */
export function parseInstallationSearch(
  search: string,
  fixedFramework?: InstallationFramework
): InstallationUiSelection {
  const params = new URLSearchParams(search);
  const selection = { ...DEFAULT_SELECTION, framework: fixedFramework ?? DEFAULT_SELECTION.framework };

  const framework = params.get('framework');

  if (!fixedFramework && isInstallationFramework(framework)) selection.framework = framework;

  const template = params.get('template');

  if (isInstallationTemplate(template)) selection.template = resolveInstallationTemplate(selection.framework, template);
  else selection.template = resolveInstallationTemplate(selection.framework, null);

  const project = params.get('project');

  if (isInstallationProject(project)) selection.project = project;

  if (selection.template === 'none') selection.project = 'existing';

  const preset = params.get('preset');
  const useCase = preset ? useCaseFromPreset(preset) : undefined;

  if (useCase) selection.useCase = useCase;

  // The default skin follows the preset's media type, whether the skin flag is missing or unknown.
  const requestedSkin = params.get('skin') ?? 'default';
  const skinFlag = isSkinFlag(requestedSkin) ? requestedSkin : 'default';

  selection.skin = skinFromFlag(skinFlag, selection.useCase);

  const renderers = getInstallationPreset(selection.useCase).renderers;
  const media = params.get('media') ?? '';

  selection.renderer = renderers.find((candidate) => candidate === media) ?? renderers[0]!;

  const requestedExtensions = params.get('extensions');
  const availableExtensions = installationExtensionsFor(selection.useCase, selection.skin, selection.renderer);

  selection.extensions =
    requestedExtensions === null
      ? defaultInstallationExtensions(selection.renderer)
      : INSTALLATION_EXTENSIONS.filter(
          (extension) =>
            parseInstallationExtensions(requestedExtensions).some(
              (requested) => isInstallationExtension(requested) && requested === extension
            ) && availableExtensions.includes(extension)
        );

  const installMethod = params.get('package-manager') ?? '';

  if (isInstallMethod(installMethod)) selection.installMethod = installMethod;

  const sourceUrl = params.get('source-url') ?? '';

  selection.sourceUrl = containsControlCharacter(sourceUrl) ? '' : sourceUrl;

  return selection;
}

/** Parse and normalize a URL using the framework fixed by a dedicated guide route, when present. */
export function parseInstallationSearchForRoute(
  route: InstallationRouteSegment | '',
  search: string,
  shadcnFramework?: InstallationFramework
): InstallationUiSelection {
  const fixedFramework = isInstallationFramework(route) ? route : route === 'cdn' ? 'html' : undefined;
  const params = new URLSearchParams(search);
  const parsed = parseInstallationSearch(search, fixedFramework);

  if (route === 'shadcn' && shadcnFramework && !isInstallationFramework(params.get('framework'))) {
    parsed.framework = shadcnFramework;
    parsed.template = resolveInstallationTemplate(shadcnFramework, parsed.template);
  }

  return normalizeInstallationSelectionForRoute(route, parsed);
}

/**
 * Write a selection back onto a query string, keeping unrelated params and leaving out anything still at its default so
 * an untouched page keeps a clean URL.
 */
export function serializeInstallationSearch(selection: InstallationUiSelection, search = ''): string {
  const params = new URLSearchParams(search);
  const preset = getInstallationPreset(selection.useCase);
  const defaults = parseInstallationSearch(`preset=${preset.flag}`);

  const write = (key: string, value: string, fallback: string) => {
    if (value === fallback) params.delete(key);
    else params.set(key, value);
  };

  write('framework', selection.framework, DEFAULT_SELECTION.framework);
  write('template', selection.template, resolveInstallationTemplate(selection.framework, null));
  write('project', selection.project, DEFAULT_SELECTION.project);
  write('preset', preset.flag, INSTALLATION_PRESETS[DEFAULT_SELECTION.useCase].flag);

  if (selection.useCase === 'background-video') params.delete('skin');
  else write('skin', skinToFlag(selection.skin), skinToFlag(defaults.skin));

  write('media', selection.renderer, defaults.renderer);
  const extensionValue = serializeInstallationExtensions(
    selection.extensions ?? defaultInstallationExtensions(selection.renderer)
  );
  const defaultExtensionValue = serializeInstallationExtensions(defaultInstallationExtensions(selection.renderer));

  write('extensions', extensionValue, defaultExtensionValue);
  write('package-manager', selection.installMethod, DEFAULT_SELECTION.installMethod);
  write('source-url', selection.sourceUrl, '');

  const string = params.toString();

  return string ? `?${string}` : '';
}

/** Remove installation parameters that the current guide cannot apply while retaining unrelated campaign params. */
export function serializeInstallationSearchForRoute(
  route: InstallationRouteSegment | '',
  selection: InstallationUiSelection,
  search = ''
): string {
  const params = new URLSearchParams(serializeInstallationSearch(selection, search));

  params.delete('method');

  let canonicalParams = params;

  if (route !== 'shadcn') {
    params.delete('framework');
    params.delete('styling');
  } else {
    canonicalParams = new URLSearchParams([['framework', selection.framework]]);

    for (const [key, value] of params) {
      if (key !== 'framework') canonicalParams.append(key, value);
    }
  }

  if (route === 'cdn') {
    canonicalParams.delete('package-manager');
    canonicalParams.delete('project');
    canonicalParams.delete('template');
  }

  const string = canonicalParams.toString();

  return string ? `?${string}` : '';
}
