import {
  DEMO_POSTER_SRC,
  DEMO_VIDEO_SRC,
  getSkinMediaType,
  HTML_CDN_BASE,
  type HtmlSkinDef,
  type MediaType,
} from './config.ts';
import { pkgDistUrl, validatePackageImports } from './package-resolver.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, '../../..');

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function extractTemplateLiteral(source: string): string {
  const match = source.match(
    /function\s+getTemplateHTML\s*\([^)]*\)\s*\{[\s\S]*?return\s+(?:\/\*html\*\/\s*)?`([\s\S]*?)`\s*;?\s*\}/
  );
  if (!match) {
    throw new Error('Could not extract getTemplateHTML template literal');
  }
  return match[1];
}

export function parseImportedNames(source: string): Map<string, string> {
  const imports = new Map<string, string>();
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(source)) !== null) {
    const names = match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    for (const name of names) {
      const [importedName, localName = importedName] = name.split(/\s+as\s+/);
      imports.set(localName, match[2]);
    }
  }

  return imports;
}

export function evaluateTemplate(templateBody: string, context: Record<string, unknown>): string {
  const fn = new Function(...Object.keys(context), `return \`${templateBody}\`;`);
  const html = fn(...Object.values(context)) as string;
  const lines = html.split('\n').map((line) => line.trimEnd());
  const minIndent = lines
    .filter((line) => line.length > 0)
    .reduce((minimum, line) => Math.min(minimum, line.length - line.trimStart().length), Infinity);

  return lines
    .map((line) => (line.length > 0 ? line.slice(minIndent) : line))
    .join('\n')
    .trim();
}

export function createRenderMediaIcon(iconSet: 'default' | 'minimal') {
  return (name: string, attrs?: Record<string, string>): string => {
    const family = iconSet === 'minimal' ? ' family="minimal"' : '';
    const attrText = Object.entries(attrs ?? {})
      .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
      .join('');

    return `<media-icon name="${escapeHtml(name)}"${family}${attrText}></media-icon>`;
  };
}

export function replaceSlots(html: string, mediaType: MediaType): string {
  const tag = mediaType === 'audio' ? 'audio' : 'video';
  const playsInline = mediaType === 'video' ? ' playsinline' : '';
  const mediaElement = `<${tag} src="${DEMO_VIDEO_SRC}"${playsInline}></${tag}>`;

  html = html.replace(
    /^([ \t]*)<!--\s*@deprecated[^\n]*\n\s*<slot name="media"><\/slot>\n\s*<slot><\/slot>/m,
    `$1${mediaElement}`
  );

  return html.replace(/<slot name="poster"><\/slot>/, `<img src="${DEMO_POSTER_SRC}" />`);
}

export function prependHtmlSkinScripts(html: string, skin: HtmlSkinDef): string {
  const isMinimal = skin.id.includes('minimal');
  const prefix = skin.id.includes('video') ? 'video' : 'audio';
  const cdnFileName = isMinimal ? `${prefix}-minimal-ui` : `${prefix}-ui`;
  const scriptTag = `<script type="module" src="${HTML_CDN_BASE}/${cdnFileName}.js"></script>`;
  const cssLink = '<link rel="stylesheet" href="./player.css">';
  const playerTag = getSkinMediaType(skin) === 'audio' ? 'audio-player' : 'video-player';
  const indented = html
    .split('\n')
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join('\n');

  return `${scriptTag}\n${cssLink}\n\n<${playerTag}>\n${indented}\n</${playerTag}>`;
}

async function loadImportedNames(
  source: string,
  template: string,
  templatePath: string,
  context: Record<string, unknown>
): Promise<void> {
  const modules = new Map<string, Record<string, unknown>>();

  for (const [name, specifier] of parseImportedNames(source)) {
    if (!new RegExp(`\\b${name}\\b`).test(template)) continue;

    let imported = modules.get(specifier);
    if (!imported) {
      const url = specifier.startsWith('@videojs/')
        ? pkgDistUrl(specifier)
        : pathToFileURL(resolve(workspaceRoot, dirname(templatePath), specifier)).href;
      imported = (await import(url)) as Record<string, unknown>;
      modules.set(specifier, imported);
    }

    if (name in imported) context[name] = imported[name];
  }
}

export async function processHtmlSkin(skin: HtmlSkinDef): Promise<string> {
  const sourcePath = resolve(workspaceRoot, skin.template);
  const source = readFileSync(sourcePath, 'utf-8');
  validatePackageImports(source, skin.template);
  const templateBody = extractTemplateLiteral(source);
  const context: Record<string, unknown> = { SEEK_TIME: 10 };

  await loadImportedNames(source, templateBody, skin.template, context);
  context.renderIcon = createRenderMediaIcon(skin.iconSet);

  const html = evaluateTemplate(templateBody, context);
  return prependHtmlSkinScripts(replaceSlots(html, getSkinMediaType(skin)), skin);
}

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
