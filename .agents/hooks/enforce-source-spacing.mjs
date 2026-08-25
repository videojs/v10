/** Runs the source-spacing check for Codex and Claude hook events. */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSource, fixSource, isGeneratedSource, isSourcePath } from './check-source-spacing.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PATCH_PATH = /^\*\*\* (?:Add|Delete|Update) File: (.+)$/gm;
const DIRECT_PATH_KEYS = new Set(['file_path', 'filePath', 'path']);

function normalizeRepoPath(path, cwd = ROOT) {
  if (typeof path !== 'string' || path.length === 0) return;

  const absolute = resolve(cwd, path);
  const repoPath = relative(ROOT, absolute);

  if (repoPath === '' || repoPath === '..' || repoPath.startsWith(`..${sep}`)) return;

  return repoPath.split(sep).join('/');
}

function collectInputPaths(value, paths, cwd, key) {
  if (typeof value === 'string') {
    if (DIRECT_PATH_KEYS.has(key)) {
      const path = normalizeRepoPath(value, cwd);

      if (path) paths.add(path);
    }

    for (const match of value.matchAll(PATCH_PATH)) {
      const path = normalizeRepoPath(match[1], cwd);

      if (path) paths.add(path);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectInputPaths(item, paths, cwd);

    return;
  }

  if (!value || typeof value !== 'object') return;

  for (const [childKey, child] of Object.entries(value)) collectInputPaths(child, paths, cwd, childKey);
}

export function pathsFromHookInput(input) {
  const paths = new Set();
  const cwd = typeof input.cwd === 'string' ? input.cwd : ROOT;

  collectInputPaths(input.tool_input, paths, cwd);

  return [...paths];
}

function readNullDelimitedGitPaths(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
}

export function changedSourcePaths() {
  const paths = new Set([
    ...readNullDelimitedGitPaths(['diff', '--name-only', '--diff-filter=ACMR', '-z']),
    ...readNullDelimitedGitPaths(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']),
    ...readNullDelimitedGitPaths(['ls-files', '--others', '--exclude-standard', '-z']),
  ]);

  return [...paths].filter(isSourcePath);
}

function formatParserError(error) {
  return typeof error === 'string' ? error : (error.message ?? JSON.stringify(error));
}

function formatFixedFiles(files) {
  const visible = files.slice(0, 5).join(', ');
  const remainder = files.length - 5;

  return remainder > 0 ? `${visible}, and ${remainder} more` : visible;
}

function formatWithVitePlus(files) {
  const require = createRequire(import.meta.url);
  const packagePath = require.resolve('vite-plus/package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const vitePlusPath = resolve(dirname(packagePath), packageJson.bin.vp);
  const result = spawnSync(process.execPath, [vitePlusPath, 'fmt', ...files, '--write'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (result.error) throw result.error;

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `Vite Plus exited with status ${result.status}`);
  }
}

export function enforceSourceSpacing(paths) {
  const errors = [];
  const fixedFiles = [];

  for (const file of [...new Set(paths)].filter(isSourcePath).sort()) {
    const path = resolve(ROOT, file);

    if (!existsSync(path) || !statSync(path).isFile()) continue;

    const source = readFileSync(path, 'utf8');

    if (isGeneratedSource(source)) continue;

    const result = analyzeSource(file, source);

    if (result.errors.length > 0) {
      for (const error of result.errors) errors.push(`${file}: ${formatParserError(error)}`);

      continue;
    }

    if (result.violations.length === 0) continue;

    writeFileSync(path, fixSource(source, result.violations));
    fixedFiles.push(file);
  }

  if (fixedFiles.length > 0) formatWithVitePlus(fixedFiles);

  return { errors, fixedFiles };
}

function respond(response = {}) {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

function main() {
  let input;

  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch (error) {
    respond({
      decision: 'block',
      reason: `The source-spacing hook could not read its event: ${error.message}`,
    });

    return;
  }

  try {
    const inputPaths = pathsFromHookInput(input);
    const paths = input.hook_event_name === 'PostToolUse' && inputPaths.length > 0 ? inputPaths : changedSourcePaths();
    const result = enforceSourceSpacing(paths);

    if (result.errors.length > 0) {
      respond({
        decision: 'block',
        reason: `The source-spacing hook found parser errors:\n${result.errors.slice(0, 10).join('\n')}`,
      });

      return;
    }

    if (result.fixedFiles.length > 0) {
      respond({
        decision: 'block',
        reason: `The source-spacing hook added required visual separation in ${formatFixedFiles(result.fixedFiles)}. Review the automatic edits before continuing.`,
      });

      return;
    }

    respond();
  } catch (error) {
    respond({
      decision: 'block',
      reason: `The source-spacing hook failed: ${error.message}`,
    });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
