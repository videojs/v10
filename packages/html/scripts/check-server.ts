import { spawnSync } from 'node:child_process';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageDir = resolve(import.meta.dirname, '..');
const packageName = '@videojs/html';
const serverDir = resolve(packageDir, 'dist/server');
const createPlayerSource = readFileSync(resolve(packageDir, 'src/player/create-player.ts'), 'utf8');
const createPlayerResult = createPlayerSource.match(/export interface CreatePlayerResult[\s\S]*?\n}/)?.[0];

if (!createPlayerResult) throw new Error('Could not find CreatePlayerResult');

const createPlayerReturnsElement = /\bPlayerElement\s*:/.test(createPlayerResult);
const videoPresetExportsPlayer = /\bVideoPlayerElement\b/.test(
  readFileSync(resolve(packageDir, 'src/presets/video.ts'), 'utf8')
);

function toPublicSpecifiers(file: string): string[] {
  const entry = file.replace(/\.js$/, '');
  if (entry === 'index') return [packageName];
  if (entry.startsWith('presets/')) return [`${packageName}/${entry.slice('presets/'.length)}`];
  if (entry.startsWith('icons/element')) return [`${packageName}/${entry.replace(/\/index$/, '')}`];
  if (entry === 'i18n/index') return [`${packageName}/i18n`];
  if (entry.startsWith('i18n/locales/')) return [`${packageName}/${entry}`];
  if (!entry.startsWith('define/')) return [];

  const subpath = entry.slice('define/'.length);
  if (subpath === 'i18n') return [];
  if (subpath === 'media/mux-video/index' || subpath === 'media/mux-audio/index') {
    return [`${packageName}/${subpath.replace(/\/index$/, '')}`, `${packageName}/${subpath}`];
  }
  return [`${packageName}/${subpath}`];
}

const imports = [...new Set(globSync('**/*.js', { cwd: serverDir }).flatMap(toPublicSpecifiers))].sort();

function runNode(args: string[]): string {
  const result = spawnSync(process.execPath, args, { cwd: packageDir, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

const importScript = `
  await Promise.all(${JSON.stringify(imports)}.map((specifier) => import(specifier)));
  const html = await import('${packageName}');
  const custom = html.createPlayer({ features: [] });
  if (${JSON.stringify(createPlayerReturnsElement)}) {
    if (typeof custom.PlayerElement !== 'function' || typeof custom.PlayerController !== 'function' || !('playerContext' in custom)) {
      throw new Error('createPlayer PlayerElement server facade is not composable');
    }
    class ServerPlayer extends custom.PlayerElement {}
    new ServerPlayer();
    new custom.PlayerController();
  } else {
    if (typeof custom.ProviderMixin !== 'function' || typeof custom.PlayerController !== 'function' || typeof custom.create !== 'function') {
      throw new Error('createPlayer ProviderMixin server facade is not composable');
    }
    class ServerHost {}
    class ServerPlayer extends custom.ProviderMixin(ServerHost) {}
    if (!(new ServerPlayer() instanceof ServerHost)) throw new Error('ProviderMixin server export is not composable');
  }
  const video = await import('${packageName}/video');
  const videoClasses = ${JSON.stringify(videoPresetExportsPlayer)}
    ? ['PlayerController', 'VideoPlayerElement', 'VideoSkinElement']
    : ['MinimalVideoSkinElement', 'VideoSkinElement'];
  for (const name of videoClasses) {
    if (typeof video[name] !== 'function') throw new Error(name + ' server export is not constructable');
  }
  if (!Array.isArray(video.videoFeatures)) throw new Error('videoFeatures server export is not usable');
  const safeDefine = await import('${packageName}/safe-define');
  if (typeof safeDefine.safeDefine !== 'function') throw new Error('safeDefine server export is not callable');
  safeDefine.safeDefine(class ServerElement {});
  const compounds = await import('${packageName}/ui/compounds');
  for (const [name, define] of Object.entries(compounds)) {
    if (name.startsWith('define')) {
      if (typeof define !== 'function') throw new Error(name + ' server export is not callable');
      define();
    }
  }
`;
for (const conditions of [
  [],
  ['react-server'],
  ['edge-light'],
  ['workerd'],
  ['worker'],
  ['react-server', 'browser'],
  ['edge-light', 'browser'],
  ['workerd', 'browser'],
  ['worker', 'browser'],
]) {
  runNode([
    ...conditions.map((condition) => `--conditions=${condition}`),
    '--input-type=module',
    '--eval',
    importScript,
  ]);
}

const resolutions = JSON.parse(
  runNode([
    '--input-type=module',
    '--eval',
    `console.log(JSON.stringify(${JSON.stringify(imports)}.map((specifier) => import.meta.resolve(specifier))))`,
  ])
) as string[];

for (const resolution of resolutions) {
  if (!resolution.includes('/dist/server/')) throw new Error(`Expected server resolution, received ${resolution}`);
  const path = new URL(resolution);
  if (!existsSync(path)) throw new Error(`Missing server entry: ${path.pathname}`);
  if (/\b(?:document|HTMLElement|window)\b/.test(readFileSync(path, 'utf8'))) {
    throw new Error(`Browser global found in server entry: ${path.pathname}`);
  }
}

const packageJson = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'));
const videoExport = packageJson.exports['./video'];
if (videoExport.browser?.default !== './dist/default/presets/video.js') {
  throw new Error('Video preset is missing its production browser condition');
}
if (videoExport.browser?.development !== './dist/dev/presets/video.js') {
  throw new Error('Video preset is missing its development browser condition');
}

const browserResolution = runNode([
  '--conditions=browser',
  '--input-type=module',
  '--eval',
  `console.log(import.meta.resolve('${packageName}/video'))`,
]);
if (!browserResolution.includes('/dist/default/presets/video.js')) {
  throw new Error(`Expected production browser resolution, received ${browserResolution}`);
}

const devBrowserResolution = runNode([
  '--conditions=browser',
  '--conditions=development',
  '--input-type=module',
  '--eval',
  `console.log(import.meta.resolve('${packageName}/video'))`,
]);
if (!devBrowserResolution.includes('/dist/dev/presets/video.js')) {
  throw new Error(`Expected development browser resolution, received ${devBrowserResolution}`);
}

console.log(
  `[server-check] ${imports.length} public imports across default, React server, Edge, workerd, worker, and browser conditions`
);
