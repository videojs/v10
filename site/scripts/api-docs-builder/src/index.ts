import * as fs from 'node:fs';
import * as path from 'node:path';
import { kebabCase } from 'es-toolkit/string';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import { extractCore } from './core-handler.js';
import { extractDataAttrs } from './data-attrs-handler.js';
import { extractHtml } from './html-handler.js';
import { extractPartDescription, extractParts } from './parts-handler.js';
import {
  type ComponentApiReference,
  ComponentApiReferenceSchema,
  type ComponentSource,
  type CoreExtraction,
  type DataAttrDef,
  type DataAttrsExtraction,
  type PartApiReference,
  type PartSource,
  type PropDef,
  type StateDef,
} from './types.js';
import { kebabToPascal, partKebabFromSource, sortProps } from './utils.js';

function buildProps(coreData: CoreExtraction): Record<string, PropDef> {
  const props: Record<string, PropDef> = {};
  for (const prop of coreData.props) {
    props[prop.name] = {
      type: prop.type,
      shortType: prop.shortType,
      description: prop.description,
      default: coreData.defaultProps[prop.name] ?? prop.default,
      required: prop.required,
    };

    if (props[prop.name]!.shortType === undefined) delete props[prop.name]!.shortType;
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
      shortType: s.shortType,
      description: s.description,
    };
    if (state[s.name]!.shortType === undefined) delete state[s.name]!.shortType;
    if (state[s.name]!.description === undefined) delete state[s.name]!.description;
  }
  return state;
}

function buildDataAttrs(dataAttrsData: DataAttrsExtraction): Record<string, DataAttrDef> {
  const dataAttributes: Record<string, DataAttrDef> = {};
  for (const attr of dataAttrsData.attrs) {
    dataAttributes[attr.name] = { description: attr.description };
  }
  return dataAttributes;
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
const OUTPUT_PATH = path.join(MONOREPO_ROOT, 'site/src/content/generated-api-reference');

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

    const componentName = kebabToPascal(dir.name);
    const componentDir = path.join(CORE_UI_PATH, dir.name);

    // Look for core file
    const coreFile = path.join(componentDir, `${dir.name}-core.ts`);
    const dataAttrsFile = path.join(componentDir, `${dir.name}-data-attrs.ts`);

    // Look for HTML element file
    const htmlFile = path.join(HTML_UI_PATH, dir.name, `${dir.name}-element.ts`);

    const source: ComponentSource = {
      name: componentName,
    };

    if (fs.existsSync(coreFile)) {
      source.corePath = coreFile;
    }

    if (fs.existsSync(dataAttrsFile)) {
      source.dataAttrsPath = dataAttrsFile;
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
    if (source.htmlPath) files.push(source.htmlPath);
    if (source.partsIndexPath) files.push(source.partsIndexPath);

    // For multi-part components, include all element files from the HTML directory
    // and React source files for JSDoc description extraction
    if (source.partsIndexPath) {
      const componentKebab = kebabCase(source.name);
      const htmlDir = path.join(HTML_UI_PATH, componentKebab);
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
function buildSingleComponentApiReference(source: ComponentSource, program: ts.Program): ComponentApiReference | null {
  // Extract from core
  const coreData = source.corePath ? extractCore(source.corePath, program, source.name) : null;

  if (!coreData) {
    log.warn(`No core data found for ${source.name}`);
    return null;
  }

  // Extract data attributes
  const dataAttrsData = source.dataAttrsPath ? extractDataAttrs(source.dataAttrsPath, program, source.name) : null;

  // Extract HTML element info
  const htmlData = source.htmlPath ? extractHtml(source.htmlPath, program, source.name) : null;

  // Build result
  const result: ComponentApiReference = {
    name: source.name,
    description: coreData.description,
    props: buildProps(coreData),
    state: buildState(coreData),
    dataAttributes: dataAttrsData ? buildDataAttrs(dataAttrsData) : {},
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
 * Discover parts and match them to HTML element files.
 *
 * Matching algorithm:
 * 1. Parse `index.parts.ts` for named exports -> part names and source paths
 * 2. Derive kebab segment from source: `./time-value` -> strip `./time-` prefix -> `value`
 * 3. For each part, look for `{name}-{kebab}-element.ts` in HTML dir (e.g., `time-group-element.ts`)
 * 4. The part with NO matching `{name}-{kebab}-element.ts` but where `{name}-element.ts` exists -> primary part
 * 5. Primary part gets: shared core file, shared data-attrs, main element (`{name}-element.ts`)
 */
function discoverParts(source: ComponentSource, program: ts.Program): PartSource[] {
  if (!source.partsIndexPath) return [];

  const partExports = extractParts(source.partsIndexPath, program);
  if (partExports.length === 0) return [];

  const componentKebab = kebabCase(source.name);
  const htmlDir = path.join(HTML_UI_PATH, componentKebab);

  const parts: PartSource[] = [];
  let hasPrimary = false;

  for (const partExport of partExports) {
    const kebab = partKebabFromSource(partExport.source, componentKebab);

    // Look for sub-part element file: {component}-{part}-element.ts
    const subPartElementFile = path.join(htmlDir, `${componentKebab}-${kebab}-element.ts`);
    const hasSubPartElement = fs.existsSync(subPartElementFile);

    // Primary part: no matching sub-part element, but main element exists
    const isPrimary = !hasSubPartElement && !!source.htmlPath;

    if (isPrimary) hasPrimary = true;

    // Resolve React source path for JSDoc description extraction
    const reactFile = path.join(path.dirname(source.partsIndexPath), `${partExport.source.replace('./', '')}.tsx`);
    const reactPath = fs.existsSync(reactFile) ? reactFile : undefined;

    const part: PartSource = {
      name: partExport.name,
      kebab,
      isPrimary,
      htmlPath: hasSubPartElement ? subPartElementFile : isPrimary ? source.htmlPath : undefined,
      reactPath,
    };

    if (!part.htmlPath) {
      log.warn(`${source.name}: Part "${partExport.name}" has no matching HTML element file`);
    }

    parts.push(part);
  }

  if (!hasPrimary) {
    log.warn(`${source.name}: No primary part identified (expected one part to use ${componentKebab}-element.ts)`);
  }

  // Primary part first so it appears first in the docs.
  return parts.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

/**
 * Build the API reference for a multi-part component.
 *
 * Multi-part components have empty top-level props/state/dataAttributes.
 * All data is in the `parts` record.
 *
 * For the primary part:
 * - Props and state come from the shared core file (`{name}-core.ts`)
 * - Data attributes come from the shared data-attrs file (`{name}-data-attrs.ts`)
 * - HTML tag comes from the main element file (`{name}-element.ts`)
 *
 * For non-primary parts:
 * - Props, state, and data attributes are empty (no dedicated core file)
 * - HTML tag comes from their sub-part element file (`{name}-{part}-element.ts`)
 */
function buildMultiPartApiReference(
  source: ComponentSource,
  program: ts.Program,
  parts: PartSource[]
): ComponentApiReference | null {
  const partsRecord: Record<string, PartApiReference> = {};

  for (const part of parts) {
    // Extract JSDoc description from React component file
    const description = part.reactPath ? extractPartDescription(part.reactPath, program, part.name) : undefined;

    if (part.isPrimary) {
      // Primary part: extract from shared core and data-attrs
      const coreData = source.corePath ? extractCore(source.corePath, program, source.name) : null;
      const dataAttrsData = source.dataAttrsPath ? extractDataAttrs(source.dataAttrsPath, program, source.name) : null;

      const elementName = `${source.name}Element`;
      const htmlData = part.htmlPath ? extractHtml(part.htmlPath, program, source.name, elementName) : null;

      const partRef: PartApiReference = {
        name: part.name,
        description,
        props: coreData ? sortProps(buildProps(coreData)) : {},
        state: coreData ? buildState(coreData) : {},
        dataAttributes: dataAttrsData ? buildDataAttrs(dataAttrsData) : {},
        platforms: {},
      };

      if (!partRef.description) delete partRef.description;
      if (htmlData) {
        partRef.platforms.html = { tagName: htmlData.tagName };
      }

      partsRecord[part.kebab] = partRef;
    } else {
      // Non-primary part: extract only HTML tag
      const elementName = `${source.name}${part.name}Element`;
      const htmlData = part.htmlPath ? extractHtml(part.htmlPath, program, source.name, elementName) : null;

      const partRef: PartApiReference = {
        name: part.name,
        description,
        props: {},
        state: {},
        dataAttributes: {},
        platforms: {},
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
    platforms: {},
    parts: partsRecord,
  };
}

/**
 * Build the API reference for a single component.
 */
function buildComponentApiReference(source: ComponentSource, program: ts.Program): ComponentApiReference | null {
  if (source.partsIndexPath) {
    const parts = discoverParts(source, program);
    if (parts.length > 0) {
      return buildMultiPartApiReference(source, program, parts);
    }
  }

  return buildSingleComponentApiReference(source, program);
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
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
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
      const apiRef = buildComponentApiReference(source, program);

      if (apiRef) {
        // Sort props (top-level only for single-part)
        apiRef.props = sortProps(apiRef.props);

        // Validate against schema before writing
        const validated = ComponentApiReferenceSchema.safeParse(apiRef);
        if (!validated.success) {
          log.error(`Schema validation failed for ${source.name}:`);
          for (const issue of validated.error.issues) {
            log.error(`  - ${issue.path.join('.')}: ${issue.message}`);
          }
          errorCount++;
          continue;
        }

        // Write JSON file
        const outputFile = path.join(OUTPUT_PATH, `${kebabCase(source.name)}.json`);
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

  log.info(`Done! Generated ${successCount} files.`);

  console.warn = originalWarn;

  if (errorCount > 0) {
    log.error(`${errorCount} errors occurred.`);
    process.exit(1);
  }
}

main();
