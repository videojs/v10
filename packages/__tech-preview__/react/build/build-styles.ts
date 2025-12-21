#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Build Styles Script
 *
 * This unified script handles the complete CSS build process for skins:
 *
 * 1. COMPILATION: Runs Tailwind CLI to compile CSS files
 *    - preflight.css (browser resets)
 *    - frosted.css (frosted skin)
 *    - minimal.css (minimal skin)
 *
 * 2. SCOPING: Scopes preflight selectors to `.vjs` class to prevent global resets
 *    - Transforms `* { margin: 0 }` → `.vjs * { margin: 0 }`
 *    - Special cases like `html`, `body`, `:root` → `.vjs`
 *
 * 3. CONCATENATION: Prepends scoped preflight to each skin CSS file
 *    - frosted.css = scoped-preflight + frosted styles
 *    - minimal.css = scoped-preflight + minimal styles
 *    - Deletes standalone preflight.css (no longer needed)
 *
 * Why scope preflight?
 * - Tailwind's preflight resets affect ALL elements globally
 * - Scoping to `.vjs` ensures resets only apply inside video player containers
 *
 * Why concatenate?
 * - Users only need to import one CSS file per skin
 * - Simpler API: import '@videojs/react/skins/frosted.css'
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import prefixSelector from 'postcss-prefix-selector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const preflightFile = 'dist/skins/preflight.css';
const frostedFile = 'dist/skins/frosted.css';
const minimalFile = 'dist/skins/minimal.css';

export default async function buildStyles() {
  console.log('🎨 Building skin styles...');

  try {
    // ============================================================================
    // STEP 1: Compile CSS files with Tailwind CLI
    // ============================================================================
    console.log('  → Compiling CSS with Tailwind...');

    // Create output directory
    const execOpts = { cwd: rootDir, stdio: 'inherit', encoding: 'utf8' };
    const skinsDir = join(rootDir, 'dist', 'skins');

    mkdirSync(skinsDir, { recursive: true });

    // Compile preflight (browser resets)
    execSync(
      'pnpm exec tailwindcss -i src/skins/preflight.css -o dist/skins/preflight.css --minify',
      execOpts,
    );

    // Compile frosted skin
    execSync(
      'pnpm exec tailwindcss -i src/skins/frosted/frosted-skin.css -o dist/skins/frosted.css --minify',
      execOpts,
    );

    // Compile minimal skin
    execSync(
      'pnpm exec tailwindcss -i src/skins/minimal/minimal-skin.css -o dist/skins/minimal.css --minify',
      execOpts,
    );

    // Verify all CSS files were created
    const preflightPath = join(rootDir, preflightFile);
    const frostedPath = join(rootDir, frostedFile);
    const minimalPath = join(rootDir, minimalFile);

    if (!existsSync(preflightPath)) {
      throw new Error(`Tailwind failed to create ${preflightFile}`);
    }
    if (!existsSync(frostedPath)) {
      throw new Error(`Tailwind failed to create ${frostedFile}`);
    }
    if (!existsSync(minimalPath)) {
      throw new Error(`Tailwind failed to create ${minimalFile}`);
    }

    // ============================================================================
    // STEP 2: Scope preflight CSS to .vjs
    // ============================================================================
    console.log('  → Scoping preflight selectors to .vjs...');

    const preflightCss = readFileSync(preflightPath, 'utf-8');

    // Use PostCSS with postcss-prefix-selector plugin to transform all selectors
    const result = await postcss([
      prefixSelector({
        prefix: '.vjs',
        transform(prefix, selector, prefixedSelector) {
          // Special case transformations:
          // - `html`, `body`, `:root` should become just `.vjs` (not `.vjs html`)
          if (selector === 'body' || selector === 'html' || selector === ':root') {
            return prefix;
          } else if (selector === ':host') {
            // Keep :host as-is (for web components)
            return selector;
          } else {
            // All other selectors: prepend .vjs
            return prefixedSelector;
          }
        },
      }),
    ]).process(preflightCss, { from: preflightFile, to: preflightFile });

    // Clean up any duplicate .vjs classes that may have been generated
    const scopedPreflight = result.css.replace(/(\.vjs\s+)+/g, '.vjs ');

    // ============================================================================
    // STEP 3: Concatenate scoped preflight into each skin
    // ============================================================================
    console.log('  → Concatenating preflight into frosted.css...');

    const frostedCss = readFileSync(frostedPath, 'utf-8');
    const frostedWithPreflight = `${scopedPreflight}\n${frostedCss}`;
    writeFileSync(frostedPath, frostedWithPreflight, 'utf-8');

    console.log('  → Concatenating preflight into minimal.css...');

    const minimalCss = readFileSync(minimalPath, 'utf-8');
    const minimalWithPreflight = `${scopedPreflight}\n${minimalCss}`;
    writeFileSync(minimalPath, minimalWithPreflight, 'utf-8');

    // ============================================================================
    // STEP 4: Clean up - delete standalone preflight.css
    // ============================================================================
    console.log('  → Removing standalone preflight.css...');
    unlinkSync(preflightPath);

    console.log('✅ Skin styles built successfully');
  } catch (error) {
    console.error('❌ Failed to build styles:', error.message);
    process.exit(1);
  }
}
