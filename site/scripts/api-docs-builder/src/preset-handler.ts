/**
 * Preset reference extraction.
 *
 * Discovers presets from packages/{html,react}/src/presets/ and extracts
 * feature bundles, skins, and media elements from their index files.
 *
 * Uses raw TypeScript AST (no type checker needed) since classification
 * is naming-convention-based and tagName extraction is from static properties.
 *
 * Convention:
 *   - HTML presets: packages/html/src/presets/{name}.ts
 *   - React presets: packages/react/src/presets/{name}/index.ts
 *   - Feature bundles: exports matching *Features (plural)
 *   - Skins: exports matching *Skin or *SkinElement (not *Tailwind*)
 *   - Tailwind: source specifier contains '.tailwind' → excluded
 *   - Media elements: remaining value exports (React only)
 *   - Feature resolution: packages/core/src/dom/store/features/presets.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { PresetReference, PresetResult, PresetSkinDef } from './pipeline.js';

interface ExportInfo {
  name: string;
  sourceSpecifier: string;
}

// ─── Export Parsing ───────────────────────────────────────────────

function parseNamedExports(filePath: string): ExportInfo[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const exports: ExportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isExportDeclaration(node) || !node.moduleSpecifier) return;
    const sourceSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;

    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        // Skip type-only exports
        if (element.isTypeOnly) continue;
        exports.push({ name: element.name.text, sourceSpecifier });
      }
    }
    // Note: `export * from` (namespace re-exports) are skipped — we only handle named exports
  });

  return exports;
}

// ─── Export Classification ────────────────────────────────────────

function isFeatureBundle(name: string): boolean {
  return name.endsWith('Features');
}

function isTailwind(sourceSpecifier: string): boolean {
  return sourceSpecifier.includes('.tailwind');
}

function isSkin(name: string): boolean {
  return /Skin(Element)?$/.test(name);
}

// ─── Tag Name Extraction ─────────────────────────────────────────

function extractTagName(elementFilePath: string): string | undefined {
  if (!fs.existsSync(elementFilePath)) return undefined;

  const content = fs.readFileSync(elementFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(elementFilePath, content, ts.ScriptTarget.Latest, true);

  let tagName: string | undefined;

  function visit(node: ts.Node) {
    if (
      ts.isPropertyDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'tagName' &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      tagName = node.initializer.text;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return tagName;
}

// ─── Feature Bundle Resolution ────────────────────────────────────

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
            // Strip 'Feature' suffix: playbackFeature → playback
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

// ─── Preset Discovery ─────────────────────────────────────────────

function discoverPresetNames(htmlPresetsDir: string, reactPresetsDir: string): string[] {
  const names = new Set<string>();

  // HTML presets: {name}.ts files
  if (fs.existsSync(htmlPresetsDir)) {
    for (const file of fs.readdirSync(htmlPresetsDir)) {
      if (file.endsWith('.ts')) {
        names.add(file.replace(/\.ts$/, ''));
      }
    }
  }

  // React presets: {name}/ directories with index.ts
  if (fs.existsSync(reactPresetsDir)) {
    for (const dir of fs.readdirSync(reactPresetsDir, { withFileTypes: true })) {
      if (dir.isDirectory() && fs.existsSync(path.join(reactPresetsDir, dir.name, 'index.ts'))) {
        names.add(dir.name);
      }
    }
  }

  return [...names].sort();
}

// ─── Preset Reference Building ────────────────────────────────────

function buildPresetReference(
  presetName: string,
  htmlPresetsDir: string,
  reactPresetsDir: string,
  featureBundleMap: Map<string, string[]>,
  monorepoRoot: string
): PresetResult | null {
  const htmlPresetFile = path.join(htmlPresetsDir, `${presetName}.ts`);
  const reactPresetFile = path.join(reactPresetsDir, presetName, 'index.ts');

  const htmlExports = parseNamedExports(htmlPresetFile);
  const reactExports = parseNamedExports(reactPresetFile);

  // Find feature bundle (from either HTML or React exports)
  const allExports = [...htmlExports, ...reactExports];
  const bundleExport = allExports.find((e) => isFeatureBundle(e.name));
  if (!bundleExport) return null;

  const features = featureBundleMap.get(bundleExport.name) ?? [];

  // Classify HTML exports
  const htmlSkins: PresetSkinDef[] = [];
  for (const exp of htmlExports) {
    if (isFeatureBundle(exp.name)) continue;
    if (isTailwind(exp.sourceSpecifier)) continue;
    if (isSkin(exp.name)) {
      // Resolve the source file to extract tagName
      const resolvedPath = path.resolve(path.dirname(htmlPresetFile), `${exp.sourceSpecifier}.ts`);
      const tagName = extractTagName(resolvedPath);
      if (tagName) {
        htmlSkins.push({ name: exp.name, tagName });
      }
    }
  }

  // Classify React exports
  const reactSkins: PresetSkinDef[] = [];
  let reactMediaElement: string | undefined;
  for (const exp of reactExports) {
    if (isFeatureBundle(exp.name)) continue;
    if (isTailwind(exp.sourceSpecifier)) continue;
    if (isSkin(exp.name)) {
      reactSkins.push({ name: exp.name });
    } else {
      // Remaining value exports → media element
      reactMediaElement = exp.name;
    }
  }

  const ref: PresetReference = {
    name: presetName,
    featureBundle: bundleExport.name,
    features,
    html: { skins: htmlSkins },
    react: { skins: reactSkins, mediaElement: reactMediaElement ?? '' },
  };

  return { name: presetName, reference: ref };
}

// ─── Pipeline ─────────────────────────────────────────────────────

export function generatePresetReferences(monorepoRoot: string): PresetResult[] {
  const htmlPresetsDir = path.join(monorepoRoot, 'packages/html/src/presets');
  const reactPresetsDir = path.join(monorepoRoot, 'packages/react/src/presets');
  const presetsFilePath = path.join(monorepoRoot, 'packages/core/src/dom/store/features/presets.ts');

  const presetNames = discoverPresetNames(htmlPresetsDir, reactPresetsDir);
  if (presetNames.length === 0) return [];

  const featureBundleMap = parseFeatureBundles(presetsFilePath);

  const results: PresetResult[] = [];
  for (const name of presetNames) {
    const result = buildPresetReference(name, htmlPresetsDir, reactPresetsDir, featureBundleMap, monorepoRoot);
    if (result) results.push(result);
  }

  return results;
}
