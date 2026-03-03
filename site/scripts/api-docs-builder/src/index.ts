import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import { extractCore } from './core-handler.js';
import { extractCSSVars } from './css-vars-handler.js';
import { extractDataAttrs } from './data-attrs-handler.js';
import { abbreviateType } from './formatter.js';
import { extractHtml } from './html-handler.js';
import { extractPartDescription, extractParts, extractSubPartProps } from './parts-handler.js';
import {
  type ComponentReference,
  ComponentReferenceSchema,
  type ComponentSource,
  type CoreExtraction,
  type CSSVarDef,
  type CSSVarsExtraction,
  type DataAttrDef,
  type DataAttrsExtraction,
  type PartReference,
  type PartSource,
  type PropDef,
  type StateDef,
} from './types.js';
import { generateUtilReferences } from './util-handler.js';
import { kebabToPascal, partKebabFromSource, sortProps } from './utils.js';

// Components whose PascalCase name doesn't match simple kebab-to-pascal conversion.
const NAME_OVERRIDES: Record<string, string> = {
  'pip-button': 'PiPButton',
};

function buildProps(coreData: CoreExtraction): Record<string, PropDef> {
  const props: Record<string, PropDef> = {};
  for (const prop of coreData.props) {
    props[prop.name] = {
      type: prop.type,
      detailedType: prop.detailedType,
      description: prop.description,
      default: coreData.defaultProps[prop.name] ?? prop.default,
      required: prop.required,
    };

    if (props[prop.name]!.detailedType === undefined) delete props[prop.name]!.detailedType;
    if (props[prop.name]!.description === undefined) delete props[prop.name]!.description;
    if (props[prop.name]!.default === undefined) delete props[prop.name]!.default;
    if (!props[prop.name]!.required) delete props[prop.name]!.required;
  }
  return props;
}

function buildState(coreData: CoreExtraction): Record<string, StateDef> {
  const state: Record<string, StateDef> = {};
  for (const s of coreData.state) {
    state[s.name] = {
      type: s.type,
      detailedType: s.detailedType,
      description: s.description,
    };
    if (state[s.name]!.detailedType === undefined) delete state[s.name]!.detailedType;
    if (state[s.name]!.description === undefined) delete state[s.name]!.description;
  }
  return state;
}

function buildDataAttrs(dataAttrsData: DataAttrsExtraction): Record<string, DataAttrDef> {
  const dataAttributes: Record<string, DataAttrDef> = {};
  for (const attr of dataAttrsData.attrs) {
    const def: DataAttrDef = { description: attr.description };
    if (attr.type) {
      const abbreviated = abbreviateType(attr.name, attr.type);
      if (abbreviated) {
        def.type = abbreviated;
        def.detailedType = attr.type;
      } else {
        def.type = attr.type;
      }
    }
    dataAttributes[attr.name] = def;
  }
  return dataAttributes;
}

function buildCSSVars(cssVarsData: CSSVarsExtraction): Record<string, CSSVarDef> {
  const cssCustomProperties: Record<string, CSSVarDef> = {};
  for (const v of cssVarsData.vars) {
    cssCustomProperties[v.name] = { description: v.description };
  }
  return cssCustomProperties;
}

// Magenta prefix - visible on both light and dark terminals
const PREFIX = '\x1b[35m[api-docs-builder]\x1b[0m';

const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, '\x1b[33mwarn:\x1b[0m', ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
  success: (...args: unknown[]) => console.log(PREFIX, ...args),
};

// Paths relative to the monorepo root
const MONOREPO_ROOT = path.resolve(import.meta.dirname, '../../../../');
const CORE_UI_PATH = path.join(MONOREPO_ROOT, 'packages/core/src/core/ui');
const HTML_UI_PATH = path.join(MONOREPO_ROOT, 'packages/html/src/ui');
const REACT_UI_PATH = path.join(MONOREPO_ROOT, 'packages/react/src/ui');
const COMPONENT_OUTPUT_PATH = path.join(MONOREPO_ROOT, 'site/src/content/generated-component-reference');
const UTIL_OUTPUT_PATH = path.join(MONOREPO_ROOT, 'site/src/content/generated-util-reference');

/**
 * Discover all components by scanning the core/ui directory.
 */
function discoverComponents(): ComponentSource[] {
  const components: ComponentSource[] = [];

  if (!fs.existsSync(CORE_UI_PATH)) {
    log.error(`Core UI path not found: ${CORE_UI_PATH}`);
    return components;
  }

  const dirs = fs.readdirSync(CORE_UI_PATH, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const componentName = NAME_OVERRIDES[dir.name] ?? kebabToPascal(dir.name);
    const componentDir = path.join(CORE_UI_PATH, dir.name);

    // Look for core file
    const coreFile = path.join(componentDir, `${dir.name}-core.ts`);
    const dataAttrsFile = path.join(componentDir, `${dir.name}-data-attrs.ts`);
    const cssVarsFile = path.join(componentDir, `${dir.name}-css-vars.ts`);

    // Look for HTML element file
    const htmlFile = path.join(HTML_UI_PATH, dir.name, `${dir.name}-element.ts`);

    const source: ComponentSource = {
      name: componentName,
      kebab: dir.name,
    };

    if (fs.existsSync(coreFile)) {
      source.corePath = coreFile;
    }

    if (fs.existsSync(dataAttrsFile)) {
      source.dataAttrsPath = dataAttrsFile;
    }

    if (fs.existsSync(cssVarsFile)) {
      source.cssVarsPath = cssVarsFile;
    }

    if (fs.existsSync(htmlFile)) {
      source.htmlPath = htmlFile;
    }

    // Check for multi-part component (index.parts.ts in React package)
    const partsIndexFile = path.join(REACT_UI_PATH, dir.name, 'index.parts.ts');
    if (fs.existsSync(partsIndexFile)) {
      source.partsIndexPath = partsIndexFile;
    }

    // Only include if we have at least a core file
    if (source.corePath) {
      components.push(source);
    }
  }

  return components;
}

/**
 * Create a TypeScript program for all relevant files.
 */
function createProgram(sources: ComponentSource[]): ts.Program {
  const files: string[] = [];

  for (const source of sources) {
    if (source.corePath) files.push(source.corePath);
    if (source.dataAttrsPath) files.push(source.dataAttrsPath);
    if (source.cssVarsPath) files.push(source.cssVarsPath);
    if (source.htmlPath) files.push(source.htmlPath);
    if (source.partsIndexPath) files.push(source.partsIndexPath);

    // For multi-part components, include all element files from the HTML directory
    // and React source files for JSDoc description extraction
    if (source.partsIndexPath) {
      const htmlDir = path.join(HTML_UI_PATH, source.kebab);
      if (fs.existsSync(htmlDir)) {
        const elementFiles = fs.readdirSync(htmlDir).filter((f) => f.endsWith('-element.ts'));
        for (const file of elementFiles) {
          const fullPath = path.join(htmlDir, file);
          if (!files.includes(fullPath)) {
            files.push(fullPath);
          }
        }
      }

      // Include React component .tsx files for JSDoc description extraction
      const reactDir = path.dirname(source.partsIndexPath);
      const reactFiles = fs.readdirSync(reactDir).filter((f) => f.endsWith('.tsx'));
      for (const file of reactFiles) {
        const fullPath = path.join(reactDir, file);
        if (!files.includes(fullPath)) {
          files.push(fullPath);
        }
      }

      // Include origin component files for re-exported parts
      const partsSource = fs.readFileSync(source.partsIndexPath, 'utf-8');
      const nonLocalImports = partsSource.match(/from\s+['"]([^.][^'"]*)['"]/g);
      if (nonLocalImports) {
        for (const match of nonLocalImports) {
          const importPath = match.replace(/from\s+['"]/, '').replace(/['"]$/, '');
          const originDir = path.resolve(path.dirname(source.partsIndexPath), importPath, '..');
          const originKebab = path.basename(originDir);

          // Include origin HTML element files
          const originHtmlDir = path.join(HTML_UI_PATH, originKebab);
          if (fs.existsSync(originHtmlDir)) {
            const originElementFiles = fs.readdirSync(originHtmlDir).filter((f) => f.endsWith('-element.ts'));
            for (const file of originElementFiles) {
              const fullPath = path.join(originHtmlDir, file);
              if (!files.includes(fullPath)) {
                files.push(fullPath);
              }
            }
          }

          // Include origin React .tsx files for JSDoc description extraction
          if (fs.existsSync(originDir)) {
            const originReactFiles = fs.readdirSync(originDir).filter((f) => f.endsWith('.tsx'));
            for (const file of originReactFiles) {
              const fullPath = path.join(originDir, file);
              if (!files.includes(fullPath)) {
                files.push(fullPath);
              }
            }
          }
        }
      }
    }
  }

  // Load base tsconfig - works for all packages since we only need type resolution
  const tsconfigPath = path.join(MONOREPO_ROOT, 'tsconfig.base.json');
  const config = tae.loadConfig(tsconfigPath);

  config.options.rootDir = MONOREPO_ROOT;

  return ts.createProgram(files, config.options);
}

/**
 * Build the API reference for a single-part component.
 */
function buildSingleComponentReference(source: ComponentSource, program: ts.Program): ComponentReference | null {
  // Extract from core
  const coreData = source.corePath ? extractCore(source.corePath, program, source.name) : null;

  if (!coreData) {
    log.warn(`No core data found for ${source.name}`);
    return null;
  }

  // Extract data attributes
  const dataAttrsData = source.dataAttrsPath ? extractDataAttrs(source.dataAttrsPath, program, source.name) : null;

  // Extract CSS custom properties
  const cssVarsData = source.cssVarsPath ? extractCSSVars(source.cssVarsPath, program, source.name) : null;

  // Extract HTML element info
  const htmlData = source.htmlPath ? extractHtml(source.htmlPath, program, source.name) : null;

  // Build result
  const result: ComponentReference = {
    name: source.name,
    description: coreData.description,
    props: buildProps(coreData),
    state: buildState(coreData),
    dataAttributes: dataAttrsData ? buildDataAttrs(dataAttrsData) : {},
    cssCustomProperties: cssVarsData ? buildCSSVars(cssVarsData) : {},
    platforms: {},
  };

  // Add HTML platform info if available
  if (htmlData) {
    result.platforms.html = {
      tagName: htmlData.tagName,
    };
  }

  // Clean up undefined description
  if (result.description === undefined) delete result.description;

  return result;
}

/**
 * Check if a React source file instantiates a Core class (matches `new \w+Core\(`).
 */
function instantiatesCore(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return /new \w+Core\(/.test(content);
  } catch {
    return false;
  }
}

function usesDataAttrs(filePath: string): boolean {
  try {
    return fs.readFileSync(filePath, 'utf-8').includes('stateAttrMap');
  } catch {
    return false;
  }
}

/**
 * Discover parts and match them to HTML element files.
 *
 * Matching algorithm:
 * 1. Parse `index.parts.ts` for named exports -> part names and source paths
 * 2. Filter out non-local re-exports (sources not starting with './')
 * 3. Derive kebab segment from source: `./time-value` -> strip `./time-` prefix -> `value`
 * 4. For each part, look for `{name}-{kebab}-element.ts` in HTML dir
 * 5. Primary part: the part whose React source file instantiates the Core class
 * 6. Primary part gets: shared core file, shared data-attrs/css-vars, main element
 */
function discoverParts(source: ComponentSource, program: ts.Program): PartSource[] {
  if (!source.partsIndexPath) return [];

  const partExports = extractParts(source.partsIndexPath, program);
  if (partExports.length === 0) return [];

  const localExports = partExports.filter((p) => p.source.startsWith('./'));
  const nonLocalExports = partExports.filter((p) => !p.source.startsWith('./'));

  if (localExports.length === 0 && nonLocalExports.length === 0) return [];

  const componentKebab = source.kebab;
  const htmlDir = path.join(HTML_UI_PATH, componentKebab);

  const parts: PartSource[] = [];

  // Process local exports
  for (const partExport of localExports) {
    const kebab = partKebabFromSource(partExport.source, componentKebab);

    // Look for sub-part element file: {component}-{part}-element.ts
    const subPartElementFile = path.join(htmlDir, `${componentKebab}-${kebab}-element.ts`);
    const hasSubPartElement = fs.existsSync(subPartElementFile);

    // Resolve React source path for JSDoc description extraction
    const reactFile = path.join(path.dirname(source.partsIndexPath!), `${partExport.source.replace('./', '')}.tsx`);
    const reactPath = fs.existsSync(reactFile) ? reactFile : undefined;

    // Primary detection: the part whose React source instantiates the Core class
    const isPrimary = !!reactPath && instantiatesCore(reactPath);

    const subPartUsesDataAttrs = !isPrimary && !!reactPath && usesDataAttrs(reactPath);

    const part: PartSource = {
      name: partExport.name,
      localName: partExport.localName,
      kebab,
      isPrimary,
      htmlPath: hasSubPartElement ? subPartElementFile : isPrimary ? source.htmlPath : undefined,
      reactPath,
      dataAttrsPath: subPartUsesDataAttrs ? source.dataAttrsPath : undefined,
      dataAttrsComponentName: subPartUsesDataAttrs ? source.name : undefined,
    };

    parts.push(part);
  }

  // Resolve re-exported parts from other components
  if (nonLocalExports.length > 0) {
    // Group by source module path
    const bySource = new Map<string, typeof nonLocalExports>();
    for (const exp of nonLocalExports) {
      const list = bySource.get(exp.source) ?? [];
      list.push(exp);
      bySource.set(exp.source, list);
    }

    const partsDir = path.dirname(source.partsIndexPath!);

    for (const [sourcePath, exports] of bySource) {
      // Resolve the origin index.parts.ts file
      const originPartsFile = path.resolve(partsDir, `${sourcePath}.ts`);
      if (!fs.existsSync(originPartsFile)) {
        log.warn(`${source.name}: Re-export source not found: ${originPartsFile}`);
        continue;
      }

      // Derive origin component kebab from directory name
      const originKebab = path.basename(path.dirname(originPartsFile));
      const originHtmlDir = path.join(HTML_UI_PATH, originKebab);
      const originReactDir = path.dirname(originPartsFile);

      // Parse origin's exports to match re-exported names to original local exports
      const originExports = extractParts(originPartsFile, program);

      for (const reExport of exports) {
        // Find the matching export in the origin file
        const originExport = originExports.find((o) => o.name === reExport.name);
        if (!originExport) {
          log.warn(`${source.name}: Re-exported part "${reExport.name}" not found in ${originPartsFile}`);
          continue;
        }

        // Derive kebab from the origin export's source path
        const kebab = partKebabFromSource(originExport.source, originKebab);

        // Look for element file in origin's HTML directory
        const subPartElementFile = path.join(originHtmlDir, `${originKebab}-${kebab}-element.ts`);
        const hasSubPartElement = fs.existsSync(subPartElementFile);

        // Resolve React source from origin component for JSDoc description
        const reactFile = path.join(originReactDir, `${originExport.source.replace('./', '')}.tsx`);
        const reactPath = fs.existsSync(reactFile) ? reactFile : undefined;

        const reExportUsesDataAttrs = !!reactPath && usesDataAttrs(reactPath);
        const originDataAttrsFile = path.join(CORE_UI_PATH, originKebab, `${originKebab}-data-attrs.ts`);
        const originDataAttrsPath =
          reExportUsesDataAttrs && fs.existsSync(originDataAttrsFile) ? originDataAttrsFile : undefined;
        const originComponentName = originDataAttrsPath ? kebabToPascal(originKebab) : undefined;

        const part: PartSource = {
          name: reExport.name,
          localName: originExport.localName,
          kebab,
          isPrimary: false, // Re-exported parts are never primary
          htmlPath: hasSubPartElement ? subPartElementFile : undefined,
          reactPath,
          dataAttrsPath: originDataAttrsPath,
          dataAttrsComponentName: originComponentName,
        };

        parts.push(part);
      }
    }
  }

  const primaryCount = parts.filter((p) => p.isPrimary).length;
  if (primaryCount === 0) {
    log.warn(`${source.name}: No primary part identified (no part instantiates a Core class)`);
  } else if (primaryCount > 1) {
    log.warn(`${source.name}: Multiple parts instantiate Core — only the first will be treated as primary`);
    let foundFirst = false;
    for (const p of parts) {
      if (p.isPrimary) {
        if (foundFirst) p.isPrimary = false;
        foundFirst = true;
      }
    }
  }

  // Primary part first so it appears first in the docs.
  return parts.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

/**
 * Build the API reference for a multi-part component.
 *
 * Multi-part components have empty top-level props/state/dataAttributes/cssCustomProperties.
 * All data is in the `parts` record.
 *
 * For the primary part:
 * - Props and state come from the shared core file (`{name}-core.ts`)
 * - Data attributes come from the shared data-attrs file (`{name}-data-attrs.ts`)
 * - CSS custom properties come from the shared css-vars file (`{name}-css-vars.ts`)
 * - HTML tag comes from the main element file (`{name}-element.ts`)
 *
 * For non-primary parts:
 * - Props, state, data attributes, and CSS vars are empty (no dedicated core file)
 * - HTML tag comes from their sub-part element file (`{name}-{part}-element.ts`)
 *
 * All parts get `platforms.react` (they come from `index.parts.ts`).
 * Parts with matching HTML element files also get `platforms.html`.
 */
function buildMultiPartReference(
  source: ComponentSource,
  program: ts.Program,
  parts: PartSource[]
): ComponentReference | null {
  const partsRecord: Record<string, PartReference> = {};

  for (const part of parts) {
    // Extract JSDoc description from React component file
    const description = part.reactPath
      ? (extractPartDescription(part.reactPath, program, part.localName) ??
        extractPartDescription(part.reactPath, program, part.name))
      : undefined;

    if (part.isPrimary) {
      // Primary part: extract from shared core, data-attrs, and css-vars
      const coreData = source.corePath ? extractCore(source.corePath, program, source.name) : null;
      const dataAttrsData = source.dataAttrsPath ? extractDataAttrs(source.dataAttrsPath, program, source.name) : null;
      const cssVarsData = source.cssVarsPath ? extractCSSVars(source.cssVarsPath, program, source.name) : null;

      const elementName = `${source.name}Element`;
      const htmlData = part.htmlPath ? extractHtml(part.htmlPath, program, source.name, elementName) : null;

      const partRef: PartReference = {
        name: part.name,
        description,
        props: coreData ? sortProps(buildProps(coreData)) : {},
        state: coreData ? buildState(coreData) : {},
        dataAttributes: dataAttrsData ? buildDataAttrs(dataAttrsData) : {},
        cssCustomProperties: cssVarsData ? buildCSSVars(cssVarsData) : {},
        platforms: { react: {} },
      };

      if (!partRef.description) delete partRef.description;
      if (htmlData) {
        partRef.platforms.html = { tagName: htmlData.tagName };
      }

      partsRecord[part.kebab] = partRef;
    } else {
      // Non-primary part: extract HTML tag, shared data attributes, and custom React props
      const elementName = part.htmlPath ? kebabToPascal(path.basename(part.htmlPath, '.ts')) : undefined;
      const htmlData =
        part.htmlPath && elementName ? extractHtml(part.htmlPath, program, source.name, elementName) : null;

      const dataAttrsData =
        part.dataAttrsPath && part.dataAttrsComponentName
          ? extractDataAttrs(part.dataAttrsPath, program, part.dataAttrsComponentName)
          : null;

      const subPartProps = part.reactPath ? extractSubPartProps(part.reactPath, program, part.localName) : {};

      const partRef: PartReference = {
        name: part.name,
        description,
        props: sortProps(subPartProps),
        state: {},
        dataAttributes: dataAttrsData ? buildDataAttrs(dataAttrsData) : {},
        cssCustomProperties: {},
        platforms: { react: {} },
      };

      if (!partRef.description) delete partRef.description;
      if (htmlData) {
        partRef.platforms.html = { tagName: htmlData.tagName };
      }

      partsRecord[part.kebab] = partRef;
    }
  }

  return {
    name: source.name,
    props: {},
    state: {},
    dataAttributes: {},
    cssCustomProperties: {},
    platforms: {},
    parts: partsRecord,
  };
}

/**
 * Build the API reference for a single component.
 */
function buildComponentReference(source: ComponentSource, program: ts.Program): ComponentReference | null {
  if (source.partsIndexPath) {
    const parts = discoverParts(source, program);
    // Single-part fallback: when filtering leaves only 1 part, use single-part mode
    if (parts.length > 1) {
      return buildMultiPartReference(source, program, parts);
    }
  }

  return buildSingleComponentReference(source, program);
}

/**
 * Main entry point.
 */
function main() {
  // typescript-api-extractor doesn't handle the `never` TypeScript type flag
  // (or a few others like ESSymbol, TemplateLiteral). It falls back to `any`
  // and logs a warning for each occurrence. This is a known gap in the alpha
  // library — not a bug in our types. Suppress the noise here.
  // https://github.com/michaldudak/typescript-api-extractor/blob/main/src/parsers/typeResolver.ts
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('Unable to handle a type with flag')) return;
    originalWarn.apply(console, args);
  };

  // Ensure output directory exists
  if (!fs.existsSync(COMPONENT_OUTPUT_PATH)) {
    fs.mkdirSync(COMPONENT_OUTPUT_PATH, { recursive: true });
  }

  // Discover components
  const components = discoverComponents();

  if (components.length === 0) {
    log.info('No components found.');
    return;
  }
  log.info(`Found ${components.length} components. Processing...`);

  // Create TypeScript program
  const program = createProgram(components);

  // Process each component
  let successCount = 0;
  let errorCount = 0;

  for (const source of components) {
    try {
      const apiRef = buildComponentReference(source, program);

      if (apiRef) {
        // Sort props (top-level only for single-part)
        apiRef.props = sortProps(apiRef.props);

        // Validate against schema before writing
        const validated = ComponentReferenceSchema.safeParse(apiRef);
        if (!validated.success) {
          log.error(`Schema validation failed for ${source.name}:`);
          for (const issue of validated.error.issues) {
            log.error(`  - ${issue.path.join('.')}: ${issue.message}`);
          }
          errorCount++;
          continue;
        }

        // Write JSON file
        const outputFile = path.join(COMPONENT_OUTPUT_PATH, `${source.kebab}.json`);
        const json = `${JSON.stringify(validated.data, null, 2)}\n`;
        fs.writeFileSync(outputFile, json);

        log.success(`✅ Generated ${path.basename(outputFile)}`);
        successCount++;
      }
    } catch (error) {
      log.error(`⚠️ Error processing ${source.name}:`, (error as Error).message);
      errorCount++;
    }
  }

  log.info(`Done! Generated ${successCount} component files.`);

  // Generate util references
  const utilResult = generateUtilReferences(UTIL_OUTPUT_PATH, MONOREPO_ROOT);
  successCount += utilResult.success;
  errorCount += utilResult.errors;

  log.info(`Done! Generated ${utilResult.success} util files.`);

  console.warn = originalWarn;

  if (errorCount > 0) {
    log.error(`${errorCount} errors occurred.`);
    process.exit(1);
  }
}

main();
