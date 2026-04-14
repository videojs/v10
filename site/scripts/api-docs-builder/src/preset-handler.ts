/**
 * Preset reference extraction.
 *
 * Discovers presets from package.json exports in packages/{html,react}/ and
 * extracts feature bundles, skins, and media elements.
 *
 * Discovery:
 *   - Reads package.json exports to find preset names and their source paths
 *   - Barrel file (./X export) → feature bundle name + file-level description
 *   - Source directory (./X/* export) → skins + media elements via directory scan
 *
 * Classification (positive detection only):
 *   - HTML: classes with `static readonly tagName`
 *     - *Skin*Element → skin
 *     - *Player* → skip
 *     - remaining → media element
 *   - React: exported functions/classes/consts
 *     - *Skin → skin
 *     - remaining → media element
 *   - .tailwind in filename → excluded (both frameworks)
 *
 * Feature resolution: packages/core/src/dom/store/features/presets.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { PresetReference, PresetResult, PresetSkinDef } from './pipeline.js';

// ─── Types ──────────────────────────────────────────────────────────

interface PresetInfo {
  name: string;
  html?: {
    barrelPath: string;
    scanDir: string;
  };
  react?: {
    barrelPath: string;
    scanDir: string;
  };
}

// ─── Package.json Discovery ─────────────────────────────────────────

/**
 * Resolve a dist output path back to its source path.
 * Handles both real packages (dist/dev/... → src/...) and test fixtures
 * (src/... → src/..., already source paths).
 */
function distToSrc(distPath: string): string {
  // Real packages: dist/(dev|default)/foo/bar.js → src/foo/bar.ts
  const distMatch = distPath.match(/^\.\/dist\/(?:dev|default)\/(.+?)(?:\.d\.ts|\.js)$/);
  if (distMatch) return `./src/${distMatch[1]}.ts`;

  // Already a source path (test fixtures)
  return distPath;
}

/**
 * Extract the source file path from a package.json export value.
 * Handles both conditional exports ({ types, default }) and string exports.
 */
function resolveExportPath(exportValue: unknown): string | undefined {
  if (typeof exportValue === 'string') return exportValue;
  if (typeof exportValue === 'object' && exportValue !== null) {
    const obj = exportValue as Record<string, unknown>;
    // Prefer types (points to source in some configs), fall back to default
    const raw = (obj.types ?? obj.default) as string | undefined;
    return raw;
  }
  return undefined;
}

/**
 * Discover presets from package.json exports for a single package.
 * Returns a map of preset name → { barrelPath, scanDir }.
 */
function discoverPresetsFromPackage(packageDir: string): Map<string, { barrelPath: string; scanDir: string }> {
  const pkgJsonPath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return new Map();

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const exports: Record<string, unknown> = pkgJson.exports ?? {};

  const result = new Map<string, { barrelPath: string; scanDir: string }>();

  for (const key of Object.keys(exports)) {
    // Match ./name (not ./, not ./name/*, not ./name/*.css)
    const match = key.match(/^\.\/([a-z][a-z0-9-]*)$/);
    if (!match) continue;

    const name = match[1]!;

    // Must have a corresponding wildcard export
    const wildcardKey = `./${name}/*`;
    if (!(wildcardKey in exports)) continue;

    const barrelRaw = resolveExportPath(exports[key]);
    const wildcardRaw = resolveExportPath(exports[wildcardKey]);
    if (!barrelRaw || !wildcardRaw) continue;

    const barrelSrc = distToSrc(barrelRaw);
    const wildcardSrc = distToSrc(wildcardRaw);

    // Resolve barrel to absolute path
    const barrelPath = path.resolve(packageDir, barrelSrc);

    // Wildcard path ends with /*.ts — strip the wildcard to get the directory
    const scanDir = path.resolve(packageDir, wildcardSrc.replace(/\/\*\.ts$/, '').replace(/\/\*$/, ''));

    if (fs.existsSync(barrelPath) && fs.existsSync(scanDir)) {
      result.set(name, { barrelPath, scanDir });
    }
  }

  return result;
}

/**
 * Discover all presets from both HTML and React packages.
 */
function discoverPresets(monorepoRoot: string): PresetInfo[] {
  const htmlPkgDir = path.join(monorepoRoot, 'packages/html');
  const reactPkgDir = path.join(monorepoRoot, 'packages/react');

  const htmlPresets = discoverPresetsFromPackage(htmlPkgDir);
  const reactPresets = discoverPresetsFromPackage(reactPkgDir);

  const allNames = new Set([...htmlPresets.keys(), ...reactPresets.keys()]);

  return [...allNames].sort().map((name) => {
    const info: PresetInfo = { name };
    const html = htmlPresets.get(name);
    const react = reactPresets.get(name);
    if (html) info.html = html;
    if (react) info.react = react;
    return info;
  });
}

// ─── Classification Helpers ─────────────────────────────────────────

function isFeatureBundle(name: string): boolean {
  return name.endsWith('Features');
}

function isTailwindFile(filePath: string): boolean {
  return path.basename(filePath).includes('.tailwind');
}

function isSkinClass(name: string): boolean {
  return /Skin.*Element/.test(name) || /Skin(Element)?$/.test(name);
}

function isPlayerClass(name: string): boolean {
  return /Player/.test(name);
}

function isReactSkin(name: string): boolean {
  return /Skin$/.test(name);
}

// ─── Tag Name Extraction ────────────────────────────────────────────

interface ClassWithTagName {
  className: string;
  tagName: string;
}

function extractClassesWithTagName(filePath: string): ClassWithTagName[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const results: ClassWithTagName[] = [];

  ts.forEachChild(sourceFile, (node) => {
    // Follow `export * from './foo'` re-exports
    if (ts.isExportDeclaration(node) && !node.exportClause && node.moduleSpecifier) {
      const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const resolved = resolveModulePath(path.dirname(filePath), specifier);
      if (resolved) {
        results.push(...extractClassesWithTagName(resolved));
      }
      return;
    }

    if (!ts.isClassDeclaration(node) || !node.name) return;
    if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return;

    for (const member of node.members) {
      if (
        ts.isPropertyDeclaration(member) &&
        member.name &&
        ts.isIdentifier(member.name) &&
        member.name.text === 'tagName' &&
        member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
        member.initializer &&
        ts.isStringLiteral(member.initializer)
      ) {
        results.push({
          className: node.name.text,
          tagName: member.initializer.text,
        });
      }
    }
  });

  return results;
}

function resolveModulePath(dir: string, specifier: string): string | undefined {
  for (const ext of ['.ts', '.tsx']) {
    const candidate = path.join(dir, `${specifier}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  // Try index file in directory
  for (const ext of ['.ts', '.tsx']) {
    const candidate = path.join(dir, specifier, `index${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

// ─── React Export Extraction ────────────────────────────────────────

function extractValueExports(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const names: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      names.push(node.name.text);
    }
    if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          names.push(decl.name.text);
        }
      }
    }
    if (
      ts.isClassDeclaration(node) &&
      node.name &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      names.push(node.name.text);
    }
  });

  return names;
}

// ─── Barrel Parsing (feature bundle only) ───────────────────────────

/**
 * Parse named value export names from a barrel file.
 * Only reads `export { X } from '...'` syntax — skips `export *` since
 * skins are discovered via directory scanning.
 */
function parseBarrelExportNames(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const names: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isExportDeclaration(node) || !node.moduleSpecifier) return;

    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        if (element.isTypeOnly) continue;
        names.push(element.name.text);
      }
    }
  });

  return names;
}

function findFeatureBundleExport(filePath: string): string | undefined {
  return parseBarrelExportNames(filePath).find(isFeatureBundle);
}

/**
 * Find the media element from a React barrel's named exports.
 * The media element is a named re-export that isn't a feature bundle or skin.
 */
function findReactMediaElement(filePath: string): string | undefined {
  const names = parseBarrelExportNames(filePath);
  for (const name of names) {
    if (isFeatureBundle(name)) continue;
    if (isReactSkin(name)) continue;
    if (/Tailwind$/.test(name)) continue;
    return name;
  }
  return undefined;
}

// ─── Feature Bundle Resolution ──────────────────────────────────────

function parseFeatureBundles(presetsFilePath: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!fs.existsSync(presetsFilePath)) return map;

  const content = fs.readFileSync(presetsFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(presetsFilePath, content, ts.ScriptTarget.Latest, true);

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) return;
    if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return;

    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (!name.endsWith('Features')) continue;

      if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer)) {
        const features: string[] = [];
        for (const element of decl.initializer.elements) {
          if (ts.isIdentifier(element)) {
            const featureName = element.text.replace(/Feature$/, '');
            features.push(featureName);
          }
        }
        map.set(name, features);
      }
    }
  });

  return map;
}

// ─── Description Extraction ─────────────────────────────────────────

function extractFileDescription(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const firstStatement = sourceFile.statements[0];
  if (!firstStatement) return undefined;

  const jsDocNodes = (firstStatement as { jsDoc?: ts.JSDoc[] }).jsDoc;
  if (!jsDocNodes || jsDocNodes.length === 0) return undefined;

  const doc = jsDocNodes[0]!;
  if (typeof doc.comment === 'string') return doc.comment;
  return undefined;
}

// ─── Directory Scanning ─────────────────────────────────────────────

function scanHtmlDirectory(scanDir: string): { skins: PresetSkinDef[]; mediaElement?: string } {
  const skins: PresetSkinDef[] = [];
  let mediaElement: string | undefined;

  if (!fs.existsSync(scanDir)) return { skins };

  const files = fs.readdirSync(scanDir).filter((f) => f.endsWith('.ts') && !isTailwindFile(f));

  for (const file of files) {
    const filePath = path.join(scanDir, file);
    const classes = extractClassesWithTagName(filePath);

    for (const cls of classes) {
      if (isSkinClass(cls.className)) {
        skins.push({ name: cls.className, tagName: cls.tagName });
      } else if (!isPlayerClass(cls.className)) {
        mediaElement = cls.tagName;
      }
    }
  }

  return { skins, mediaElement };
}

function scanReactDirectory(scanDir: string, barrelPath: string): PresetSkinDef[] {
  const skins: PresetSkinDef[] = [];

  if (!fs.existsSync(scanDir)) return skins;

  const barrelBasename = path.basename(barrelPath);
  const files = fs
    .readdirSync(scanDir)
    .filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !isTailwindFile(f) && f !== barrelBasename);

  for (const file of files) {
    const filePath = path.join(scanDir, file);
    const exports = extractValueExports(filePath);

    for (const name of exports) {
      if (isFeatureBundle(name)) continue;
      if (isReactSkin(name)) {
        skins.push({ name });
      }
    }
  }

  return skins;
}

// ─── Preset Reference Building ──────────────────────────────────────

function buildPresetReference(preset: PresetInfo, featureBundleMap: Map<string, string[]>): PresetResult | null {
  // Find feature bundle name from barrel files (try both frameworks)
  const bundleName =
    (preset.html && findFeatureBundleExport(preset.html.barrelPath)) ??
    (preset.react && findFeatureBundleExport(preset.react.barrelPath));

  if (!bundleName) return null;

  const features = featureBundleMap.get(bundleName) ?? [];

  // Scan HTML directory
  const htmlResult = preset.html ? scanHtmlDirectory(preset.html.scanDir) : { skins: [] as PresetSkinDef[] };

  // Scan React directory for skins, read barrel for media element
  const reactSkins = preset.react
    ? scanReactDirectory(preset.react.scanDir, preset.react.barrelPath)
    : ([] as PresetSkinDef[]);
  const reactMediaElement = preset.react ? findReactMediaElement(preset.react.barrelPath) : undefined;

  // Extract description from barrel JSDoc (try React first, fall back to HTML)
  const description =
    (preset.react && extractFileDescription(preset.react.barrelPath)) ??
    (preset.html && extractFileDescription(preset.html.barrelPath));

  const ref: PresetReference = {
    name: preset.name,
    featureBundle: bundleName,
    features,
    html: { skins: htmlResult.skins },
    react: { skins: reactSkins, mediaElement: reactMediaElement ?? '' },
  };

  if (htmlResult.mediaElement) ref.html.mediaElement = htmlResult.mediaElement;
  if (description) ref.description = description;

  return { name: preset.name, reference: ref };
}

// ─── Pipeline ───────────────────────────────────────────────────────

export function generatePresetReferences(monorepoRoot: string): PresetResult[] {
  const presetsFilePath = path.join(monorepoRoot, 'packages/core/src/dom/store/features/presets.ts');
  const featureBundleMap = parseFeatureBundles(presetsFilePath);

  const presets = discoverPresets(monorepoRoot);
  if (presets.length === 0) return [];

  const results: PresetResult[] = [];
  for (const preset of presets) {
    const result = buildPresetReference(preset, featureBundleMap);
    if (result) results.push(result);
  }

  return results;
}
