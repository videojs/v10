import { VJS10_DEMO_VIDEO } from '@/consts';
import type { Skin } from '@/stores/homePageDemos';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';

export function generateHTMLCode(skin: Skin): string {
  const skinTag = skin === 'default' ? 'video-skin' : 'video-minimal-skin';
  const cdnFile = skin === 'default' ? 'video' : 'video-minimal';

  return `<script type="module" src="${CDN_BASE}/${cdnFile}.js"></script>

<video-player>
  <${skinTag}>
    <video src="${VJS10_DEMO_VIDEO.mp4}" playsinline></video>
  </${skinTag}>
</video-player>`;
}

export function generateReactCode(skin: Skin): string {
  const skinComponent = skin === 'default' ? 'VideoSkin' : 'MinimalVideoSkin';
  const skinCss = skin === 'default' ? 'skin' : 'minimal-skin';

  return `import { createPlayer } from '@videojs/react';
import { ${skinComponent}, Video, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/${skinCss}.css';

const Player = createPlayer({ features: videoFeatures });

export function VideoPlayer() {
  return (
    <Player.Provider>
      <${skinComponent} poster="${VJS10_DEMO_VIDEO.poster}">
        <Video src="${VJS10_DEMO_VIDEO.mp4}" playsInline />
      </${skinComponent}>
    </Player.Provider>
  );
}`;
}

/**
 * Transform ejected React skin TSX into a self-contained VideoPlayer component
 * that wraps `Player.Provider` > `Container` with the skin body inline.
 *
 * The skin's props are preserved as-is (poster render prop, className, style).
 * `children` is replaced with a `src` prop passed to `<Video>`.
 */
export function transformEjectedReactCode(tsx: string, skin: Skin): string {
  const skinClass =
    skin === 'default'
      ? 'media-default-skin media-default-skin--video'
      : 'media-minimal-skin media-minimal-skin--video';

  let code = tsx;

  // 1. Rename the SkinProps interface → VideoPlayerProps.
  //    Replace `children?: ReactNode` with `src: string`. Keep everything else.
  code = code.replace(/export interface (\w+)SkinProps/, 'export interface VideoPlayerProps');
  code = code.replace(/(\s*)children\?: ReactNode;\n/, '$1src: string;\n');

  // 2. Add createPlayer, Video, videoFeatures to the @videojs/react import.
  code = code.replace(
    /import \{([^}]+)\} from '@videojs\/react';/,
    (_, names: string) => `import { ${names.trim()}, createPlayer, Video, videoFeatures } from '@videojs/react';`
  );

  // 3. Move SEEK_TIME above the injected Player const.
  const seekMatch = code.match(/\n*const SEEK_TIME = \d+;\n*/);
  const seekLine = seekMatch ? seekMatch[0].trim() : '';
  if (seekMatch) {
    code = code.replace(seekMatch[0], '\n');
  }

  // 4. Inject CSS import, SEEK_TIME, and Player const after the import block.
  const lastImportEnd = findLastImportIndex(code);
  const injected = [
    "import './player.css';",
    '',
    seekLine,
    '',
    'const Player = createPlayer({ features: videoFeatures });',
  ].join('\n');
  code = `${code.slice(0, lastImportEnd)}\n${injected}\n${code.slice(lastImportEnd)}`;

  // 5. Replace {children} with <Video src={src} playsInline />.
  code = code.replace(/(\s*)\{children\}\n/, '$1<Video src={src} playsInline />\n');

  // 6. Transform the exported skin function into VideoPlayer.
  //    Swap `children` for `src` in destructuring, wrap body in Player.Provider.
  code = code.replace(
    /export function \w+Skin\(props: \w+SkinProps\): ReactNode \{\s*const \{ children, className, poster, \.\.\.rest \} = props;\s*\n\s*return \(\s*\n\s*<Container className=\{`[^`]*`\} \{\.\.\.rest\}>([\s\S]*?)\s*<\/Container>\s*\n\s*\);\s*\n\}/,
    (_, body: string) => {
      const reindented = body
        .replace(/^\n+/, '')
        .split('\n')
        .map((line) => (line.trim() === '' ? '' : `  ${line}`))
        .join('\n');
      return [
        '/**',
        ' * @example',
        ' * ```tsx',
        ' * <VideoPlayer',
        ` *   src="${VJS10_DEMO_VIDEO.mp4}"`,
        ` *   poster="${VJS10_DEMO_VIDEO.poster}"`,
        ' * />',
        ' * ```',
        ' */',
        'export function VideoPlayer(props: VideoPlayerProps): ReactNode {',
        '  const { src, className, poster, ...rest } = props;',
        '',
        '  return (',
        '    <Player.Provider>',
        `      <Container className={\`${skinClass} \${className ?? ''}\`} {...rest}>`,
        `${reindented}`,
        '      </Container>',
        '    </Player.Provider>',
        '  );',
        '}',
      ].join('\n');
    }
  );

  // 7. Clean up any triple+ blank lines.
  code = code.replace(/\n{3,}/g, '\n\n');

  return code;
}

function findLastImportIndex(source: string): number {
  const importRegex = /^import\s+.+from\s+['"][^'"]+['"];?\s*$/gm;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(source)) !== null) {
    lastEnd = match.index + match[0].length;
  }
  return lastEnd;
}
