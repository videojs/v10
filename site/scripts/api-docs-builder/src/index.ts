import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateComponentReferences } from './pipeline.js';
import { ComponentReferenceSchema } from './types.js';
import { generateUtilReferences } from './util-handler.js';

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
const COMPONENT_OUTPUT_PATH = path.join(MONOREPO_ROOT, 'site/src/content/generated-component-reference');
const UTIL_OUTPUT_PATH = path.join(MONOREPO_ROOT, 'site/src/content/generated-util-reference');

/**
 * Main entry point.
 */
function main() {
  // typescript-api-extractor doesn't handle the `never` TypeScript type flag
  // (or a few others like ESSymbol, TemplateLiteral). It falls back to `any`
  // and logs a warning for each occurrence. This is a known gap in the alpha
  // library — not a bug in our types. Suppress the noise here.
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('Unable to handle a type with flag')) return;
    originalWarn.apply(console, args);
  };

  // Ensure output directory exists
  if (!fs.existsSync(COMPONENT_OUTPUT_PATH)) {
    fs.mkdirSync(COMPONENT_OUTPUT_PATH, { recursive: true });
  }

  // Generate component references via pipeline
  const componentResults = generateComponentReferences(MONOREPO_ROOT);

  if (componentResults.length === 0) {
    log.info('No components found.');
  } else {
    log.info(`Found ${componentResults.length} components. Processing...`);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const result of componentResults) {
    // Validate against schema before writing
    const validated = ComponentReferenceSchema.safeParse(result.reference);
    if (!validated.success) {
      log.error(`Schema validation failed for ${result.name}:`);
      for (const issue of validated.error.issues) {
        log.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
      errorCount++;
      continue;
    }

    // Write JSON file
    const outputFile = path.join(COMPONENT_OUTPUT_PATH, `${result.kebab}.json`);
    const json = `${JSON.stringify(validated.data, null, 2)}\n`;
    fs.writeFileSync(outputFile, json);

    log.success(`✅ Generated ${path.basename(outputFile)}`);
    successCount++;
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
