import {
  getInstallationPreset,
  INSTALLATION_PRESETS,
  type InstallMethod,
  type Renderer,
  type Skin,
  type UseCase,
} from './types';

/**
 * The installation choices encoded in the page URL. `install-method` stores the package manager on package-based routes
 * and stays at its default on the CDN route.
 */
export interface InstallationSelection {
  useCase: UseCase;
  skin: Skin;
  renderer: Renderer;
  sourceUrl: string;
  installMethod: InstallMethod;
}

export const DEFAULT_SELECTION: InstallationSelection = {
  useCase: 'default-video',
  skin: 'video',
  renderer: 'html5-video',
  sourceUrl: '',
  installMethod: 'npm',
};

const INSTALL_METHODS: readonly InstallMethod[] = ['cdn', 'npm', 'pnpm', 'yarn', 'bun'];
// SAFETY: INSTALLATION_PRESETS is a const object, so its keys are exactly the UseCase union.
const USE_CASES = Object.keys(INSTALLATION_PRESETS) as UseCase[];

type SkinFlag = 'default' | 'minimal' | 'none';

function isSkinFlag(value: string): value is SkinFlag {
  return value === 'default' || value === 'minimal' || value === 'none';
}

function isInstallMethod(value: string): value is InstallMethod {
  return INSTALL_METHODS.some((method) => method === value);
}

/** Mirror of the CLI's skin mapping: the flag names a tier, the preset decides whether that is the video or audio skin. */
export function skinFromFlag(flag: string, useCase: UseCase): Skin | undefined {
  if (!isSkinFlag(flag)) return undefined;

  const isAudio = getInstallationPreset(useCase).mediaType === 'audio';
  const map = {
    default: isAudio ? 'audio' : 'video',
    minimal: isAudio ? 'minimal-audio' : 'minimal-video',
    none: 'none',
  } satisfies Record<SkinFlag, Skin>;

  return map[flag];
}

export function skinToFlag(skin: Skin): SkinFlag {
  if (skin === 'none') return 'none';

  return skin.startsWith('minimal') ? 'minimal' : 'default';
}

/**
 * Fit a skin and media pick to a preset: the skin keeps its tier but follows the preset's media type, and media the
 * preset cannot play falls back to its first option.
 */
export function coerceToPreset(
  useCase: UseCase,
  skin: Skin,
  media: Renderer
): Pick<InstallationSelection, 'skin' | 'renderer'> {
  const renderers = getInstallationPreset(useCase).renderers;

  return {
    skin: skinFromFlag(skinToFlag(skin), useCase)!,
    renderer: renderers.includes(media) ? media : renderers[0]!,
  };
}

/**
 * Read the selection encoded in a query string. Unknown or invalid values fall back to the default, and a media pick
 * that the chosen preset cannot play is dropped, matching what the pickers would do on screen.
 */
export function parseInstallationSearch(search: string): InstallationSelection {
  const params = new URLSearchParams(search);
  const selection = { ...DEFAULT_SELECTION };

  const preset = params.get('preset');
  const useCase = USE_CASES.find((key) => INSTALLATION_PRESETS[key].flag === preset);

  if (useCase) selection.useCase = useCase;

  // The default skin follows the preset's media type, whether the skin flag is missing or unknown.
  selection.skin =
    skinFromFlag(params.get('skin') ?? 'default', selection.useCase) ?? skinFromFlag('default', selection.useCase)!;

  const renderers = getInstallationPreset(selection.useCase).renderers;
  const media = params.get('media') ?? '';

  selection.renderer = renderers.find((candidate) => candidate === media) ?? renderers[0]!;

  const installMethod = params.get('install-method') ?? '';

  if (isInstallMethod(installMethod)) selection.installMethod = installMethod;

  selection.sourceUrl = params.get('source-url') ?? '';

  return selection;
}

/**
 * Write a selection back onto a query string, keeping unrelated params and leaving out anything still at its default so
 * an untouched page keeps a clean URL.
 */
export function serializeInstallationSearch(selection: InstallationSelection, search = ''): string {
  const params = new URLSearchParams(search);
  const preset = getInstallationPreset(selection.useCase);
  const defaults = parseInstallationSearch(`preset=${preset.flag}`);

  const write = (key: string, value: string, fallback: string) => {
    if (value === fallback) params.delete(key);
    else params.set(key, value);
  };

  write('preset', preset.flag, INSTALLATION_PRESETS[DEFAULT_SELECTION.useCase].flag);
  write('skin', skinToFlag(selection.skin), skinToFlag(defaults.skin));
  write('media', selection.renderer, defaults.renderer);
  write('install-method', selection.installMethod, DEFAULT_SELECTION.installMethod);
  write('source-url', selection.sourceUrl, '');

  const string = params.toString();

  return string ? `?${string}` : '';
}
