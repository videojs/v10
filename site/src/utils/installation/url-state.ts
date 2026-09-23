import {
  containsControlCharacter,
  fitSelectionToPreset,
  getInstallationPreset,
  INSTALLATION_PRESETS,
  isPackageManager,
  isSkinFlag,
  skinFromFlag,
  skinToFlag,
  useCaseFromPreset,
  type InstallMethod,
  type Renderer,
  type Skin,
  type UseCase,
} from '@videojs/installation';

/**
 * The installation choices encoded in the page URL. `install-method` stores the package manager on package-based routes
 * and stays at its default on the CDN route.
 */
export interface InstallationUiSelection {
  useCase: UseCase;
  skin: Skin;
  renderer: Renderer;
  sourceUrl: string;
  installMethod: InstallMethod;
}

export const DEFAULT_SELECTION: InstallationUiSelection = {
  useCase: 'default-video',
  skin: 'video',
  renderer: 'html5-video',
  sourceUrl: '',
  installMethod: 'npm',
};

function isInstallMethod(value: string): value is InstallMethod {
  return value === 'cdn' || isPackageManager(value);
}

/** Fit URL-backed picks to constraints imposed by a dedicated installation route. */
export function normalizeInstallationSelectionForRoute(
  route: string,
  selection: InstallationUiSelection
): InstallationUiSelection {
  let normalized =
    route === 'cdn' || selection.installMethod === 'cdn' ? { ...selection, installMethod: 'npm' as const } : selection;

  if (route !== 'shadcn') return normalized;

  const useCase = normalized.useCase === 'background-video' ? 'default-video' : normalized.useCase;
  const selectedSkin = normalized.skin === 'none' ? skinFromFlag('default', useCase) : normalized.skin;
  const fitted = fitSelectionToPreset(useCase, selectedSkin, normalized.renderer);

  normalized = { ...normalized, useCase, skin: fitted.skin, renderer: fitted.media };

  return normalized;
}

/**
 * Read the selection encoded in a query string. Unknown or invalid values fall back to the default, and a media pick
 * that the chosen preset cannot play is dropped, matching what the pickers would do on screen.
 */
export function parseInstallationSearch(search: string): InstallationUiSelection {
  const params = new URLSearchParams(search);
  const selection = { ...DEFAULT_SELECTION };

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

  const installMethod = params.get('install-method') ?? '';

  if (isInstallMethod(installMethod)) selection.installMethod = installMethod;

  const sourceUrl = params.get('source-url') ?? '';

  selection.sourceUrl = containsControlCharacter(sourceUrl) ? '' : sourceUrl;

  return selection;
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

  // The interactive pages use `install-method`; `package-manager` is accepted only by the Markdown renderer.
  params.delete('package-manager');

  write('preset', preset.flag, INSTALLATION_PRESETS[DEFAULT_SELECTION.useCase].flag);
  write('skin', skinToFlag(selection.skin), skinToFlag(defaults.skin));
  write('media', selection.renderer, defaults.renderer);
  write('install-method', selection.installMethod, DEFAULT_SELECTION.installMethod);
  write('source-url', selection.sourceUrl, '');

  const string = params.toString();

  return string ? `?${string}` : '';
}
