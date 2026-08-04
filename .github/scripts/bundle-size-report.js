/**
 * Generates a bundle size report from measurement JSON data.
 *
 * Usage:
 *   node bundle-size-report.js --pr pr-size.json [--base base-size.json]
 *
 * When --base is omitted, generates a local report showing current sizes.
 * When --base is provided, generates a comparison report with diffs.
 *
 * Reads JSON arrays of { name, size, type, category?, format, lazySize?,
 * totalSize? } entries produced by bundle-size.js.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function formatDelta(current, previous) {
  if (previous === undefined) return { bytes: '—', pct: '' };
  const diff = current - previous;
  if (diff === 0) return { bytes: '0 B', pct: '0%' };
  const sign = diff > 0 ? '+' : '-';
  const pct = previous === 0 ? '∞' : Math.abs((diff / previous) * 100).toFixed(1);
  return {
    bytes: `${sign}${formatBytes(Math.abs(diff))}`,
    pct: previous === 0 ? `${sign}∞%` : `${sign}${pct}%`,
  };
}

function lazySize(entry) {
  if (!entry) return 0;
  return (
    entry.lazySize ??
    Math.max(0, (entry.totalSize ?? entry.size) - entry.size)
  );
}

function lazyLabel(entry) {
  const lazy = lazySize(entry);
  return lazy > 0 ? formatBytes(lazy) : '—';
}

function lazyDelta(current, previous) {
  const currentLazy = lazySize(current);
  const previousLazy = lazySize(previous);
  if (currentLazy === 0 && previousLazy === 0) return '—';
  return formatDelta(currentLazy, previousLazy).bytes;
}

const HIGHLIGHT_THRESHOLD = 300;

function isHighlightedChange(current, previous) {
  if (!previous) return true;
  const totalDelta =
    current.size + lazySize(current) - previous.size - lazySize(previous);
  return (
    Math.abs(current.size - previous.size) > HIGHLIGHT_THRESHOLD ||
    Math.abs(lazySize(current) - lazySize(previous)) > HIGHLIGHT_THRESHOLD ||
    Math.abs(totalDelta) > HIGHLIGHT_THRESHOLD
  );
}

/** Preferred display order for packages. Unlisted packages sort to the end. */
const PACKAGE_ORDER = ['html', 'react', 'core', 'element', 'store', 'utils'];

/** Group entries by package: @videojs/html/ui/x → html */
function groupByPackage(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const match = entry.name.match(/^@videojs\/([^/]+)/);
    const pkg = match ? match[1] : 'other';
    if (!groups.has(pkg)) groups.set(pkg, []);
    groups.get(pkg).push(entry);
  }

  const sorted = new Map();
  for (const pkg of PACKAGE_ORDER) {
    if (groups.has(pkg)) sorted.set(pkg, groups.get(pkg));
  }
  for (const [pkg, entries] of groups) {
    if (!sorted.has(pkg)) sorted.set(pkg, entries);
  }
  return sorted;
}

/** Display label for an entry relative to its package. */
function entryLabel(entryName, pkg) {
  const subpath = entryName.replace(`@videojs/${pkg}`, '');
  return subpath === '' ? '`.`' : `\`${subpath}\``;
}

// ---------------------------------------------------------------------------
// Category breakdown (size-only, collapsed <details>)
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = [
  'preset',
  'media',
  'player',
  'skin',
  'ui',
  'feature',
];

const CATEGORY_LABELS = {
  preset: 'Presets',
  media: 'Media',
  player: 'Players',
  skin: 'Skins',
  ui: 'UI Components',
  feature: 'Features',
};

function generateCategoryBreakdowns(entries, pkg) {
  const byCategory = new Map();
  for (const entry of entries) {
    const cat = entry.category;
    if (!cat) continue;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(entry);
  }

  const lines = [];

  for (const cat of CATEGORY_ORDER) {
    const catEntries = byCategory.get(cat);
    if (!catEntries || catEntries.length === 0) continue;

    const label = CATEGORY_LABELS[cat] ?? cat;
    const isSkin = cat === 'skin';
    const hasLazy = catEntries.some((entry) => lazySize(entry) > 0);

    lines.push('<details>');
    lines.push(`<summary><b>${label} (${catEntries.length})</b></summary>`);
    lines.push('');

    if (isSkin) {
      lines.push(
        hasLazy
          ? '| Entry | Type | Initial | Lazy |'
          : '| Entry | Type | Initial |',
      );
      lines.push(hasLazy ? '|---|---|--:|--:|' : '|---|---|--:|');
    } else {
      lines.push(
        hasLazy ? '| Entry | Initial | Lazy |' : '| Entry | Initial |',
      );
      lines.push(hasLazy ? '|---|--:|--:|' : '|---|--:|');
    }

    for (const entry of catEntries) {
      const el = entryLabel(entry.name, pkg);
      const fmt = entry.format ?? 'js';
      if (isSkin) {
        const cells = [`${el}`, fmt, formatBytes(entry.size)];
        if (hasLazy) cells.push(lazyLabel(entry));
        lines.push(`| ${cells.join(' | ')} |`);
      } else {
        const cells = [`${el}`, formatBytes(entry.size)];
        if (hasLazy) cells.push(lazyLabel(entry));
        lines.push(`| ${cells.join(' | ')} |`);
      }
    }

    lines.push('</details>');
    lines.push('');
  }

  return lines;
}

/** Flat size-only breakdown for packages without categories. */
function generateFlatBreakdown(entries, pkg) {
  const lines = [];

  lines.push('<details>');
  lines.push(`<summary><b>Entries (${entries.length})</b></summary>`);
  lines.push('');
  const hasLazy = entries.some((entry) => lazySize(entry) > 0);
  lines.push(hasLazy ? '| Entry | Initial | Lazy |' : '| Entry | Initial |');
  lines.push(hasLazy ? '|---|--:|--:|' : '|---|--:|');

  for (const entry of entries) {
    const el = entryLabel(entry.name, pkg);
    const cells = [`${el}`, formatBytes(entry.size)];
    if (hasLazy) cells.push(lazyLabel(entry));
    lines.push(`| ${cells.join(' | ')} |`);
  }

  lines.push('');
  lines.push('</details>');
  lines.push('');

  return lines;
}

function generateComparisonTable(entries, removed, pkg, baseEntryMap) {
  const lines = [
    '| Path | Base initial | PR initial | Initial diff | Lazy diff |',
    '|---|--:|--:|--:|--:|',
  ];

  for (const entry of entries) {
    const el = entryLabel(entry.name, pkg);
    const previousEntry = baseEntryMap[entry.name];
    const prevInitial = previousEntry?.size;
    const d = formatDelta(entry.size, prevInitial);
    const baseSize = prevInitial !== undefined ? formatBytes(prevInitial) : '—';
    const initialDelta = previousEntry ? `${d.bytes} (${d.pct})` : 'new';
    lines.push(
      `| ${el} | ${baseSize} | ${formatBytes(entry.size)} | ${initialDelta} | ${lazyDelta(entry, previousEntry)} |`,
    );
  }

  for (const entry of removed) {
    const el = entryLabel(entry.name, pkg);
    lines.push(
      `| ${el} | ${formatBytes(entry.size)} | — | removed | ${lazyDelta(undefined, entry)} |`,
    );
  }

  lines.push('');
  return lines;
}

// ---------------------------------------------------------------------------
// Comparison report (CI — PR vs base)
// ---------------------------------------------------------------------------

export function generateComparisonReport(current, base) {
  const currentMap = Object.fromEntries(current.map((e) => [e.name, e.size]));
  const baseEntryMap = Object.fromEntries(base.map((e) => [e.name, e]));

  const groups = groupByPackage(current);

  // Build a set of all base entries grouped by package so we can detect removals
  const baseGroups = groupByPackage(base);

  const lines = [];
  const pkgIcons = {
    core: '🧩',
    element: '🏷️',
    html: '🎨',
    react: '⚛️',
    store: '📦',
    utils: '🔧',
  };

  lines.push('<!-- bundle-size-report -->');
  lines.push('# 📦 Bundle Size Report');
  lines.push('');

  // Collect all package names from both sides
  const allPackages = new Set([...groups.keys(), ...baseGroups.keys()]);
  const orderedPackages = [];
  for (const pkg of PACKAGE_ORDER) {
    if (allPackages.has(pkg)) orderedPackages.push(pkg);
  }
  for (const pkg of allPackages) {
    if (!orderedPackages.includes(pkg)) orderedPackages.push(pkg);
  }

  for (const pkg of orderedPackages) {
    const entries = groups.get(pkg) ?? [];
    const baseEntries = baseGroups.get(pkg) ?? [];
    const pkgIcon = pkgIcons[pkg] ?? '📦';

    // Every byte is intentional here. Measurements are deterministic, so a
    // reporting threshold would hide legitimate small improvements/regressions.
    const changed = entries.filter((e) => {
      const previousEntry = baseEntryMap[e.name];
      if (!previousEntry) return true;
      return (
        e.size !== previousEntry.size ||
        lazySize(e) !== lazySize(previousEntry)
      );
    });

    // Entries that existed in base but are missing in PR (removed)
    const removed = baseEntries.filter((e) => currentMap[e.name] === undefined);

    const highlighted = changed.filter((entry) =>
      isHighlightedChange(entry, baseEntryMap[entry.name]),
    );
    const small = changed.filter(
      (entry) => !isHighlightedChange(entry, baseEntryMap[entry.name]),
    );
    const hasHighlightedChanges = highlighted.length > 0 || removed.length > 0;

    // Category breakdowns for packages with categories (html, react)
    const hasCategories = entries.some((e) => e.category);
    const breakdownLines = hasCategories
      ? generateCategoryBreakdowns(entries, pkg)
      : entries.length > 1
        ? generateFlatBreakdown(entries, pkg)
        : [];

    if (hasHighlightedChanges) {
      lines.push(`## ${pkgIcon} @videojs/${pkg}`);
      lines.push('');
      lines.push(
        ...generateComparisonTable(
          highlighted,
          removed,
          pkg,
          baseEntryMap,
        ),
      );
      if (small.length > 0) {
        lines.push('<details>');
        lines.push(
          `<summary>Small changes (${small.length}, ≤ ${HIGHLIGHT_THRESHOLD} B)</summary>`,
        );
        lines.push('');
        lines.push(...generateComparisonTable(small, [], pkg, baseEntryMap));
        lines.push('</details>');
        lines.push('');
      }
      lines.push(...breakdownLines);
    } else if (small.length > 0) {
      lines.push('<details>');
      lines.push(
        `<summary><b>${pkgIcon} @videojs/${pkg}</b> — ${small.length} small size ${small.length === 1 ? 'change' : 'changes'}</summary>`,
      );
      lines.push('');
      lines.push(...generateComparisonTable(small, [], pkg, baseEntryMap));
      lines.push(...breakdownLines);
      lines.push('</details>');
      lines.push('');
    } else {
      lines.push('<details>');
      lines.push(`<summary><b>${pkgIcon} @videojs/${pkg}</b> — no changes</summary>`);
      lines.push('');
      lines.push(...breakdownLines);
      lines.push('</details>');
      lines.push('');
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('<details>');
  lines.push('<summary>ℹ️ How to interpret</summary>');
  lines.push('');
  lines.push(
    'Each entry is independently bundled, minified, and brotli-compressed. Initial size includes its static import graph; lazy dynamic chunks are reported separately.',
  );
  lines.push('');
  lines.push(
    'Entries are not additive because their dependency graphs overlap. Preset rows represent realistic combined bundles.',
  );
  lines.push('');
  lines.push(
    `Changes of ${HIGHLIGHT_THRESHOLD} B or less across initial, lazy, and total size are collapsed, not discarded.`,
  );
  lines.push('');
  lines.push('Run `pnpm size` locally to check current initial sizes.');
  lines.push('</details>');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Local report (terminal — ANSI colored)
// ---------------------------------------------------------------------------

const ESC = '\x1b[';
const ansi = {
  bold: (s) => `${ESC}1m${s}${ESC}22m`,
  dim: (s) => `${ESC}2m${s}${ESC}22m`,
  cyan: (s) => `${ESC}36m${s}${ESC}39m`,
  yellow: (s) => `${ESC}33m${s}${ESC}39m`,
  white: (s) => `${ESC}37m${s}${ESC}39m`,
  green: (s) => `${ESC}32m${s}${ESC}39m`,
};

/**
 * Render rows as a padded, aligned table for terminal output.
 *
 * Each row is an array of cell values. Cells can be plain strings or
 * `{ text, style }` objects where `style` is an ansi function.
 * The first row is treated as a dim header.
 */
function printTable(rows) {
  if (rows.length === 0) return '';

  const text = (cell) => (typeof cell === 'string' ? cell : cell.text);
  const style = (cell) =>
    typeof cell === 'string' ? (s) => s : cell.style ?? ((s) => s);

  const cols = rows[0].length;
  const widths = Array.from({ length: cols }, () => 0);
  for (const row of rows) {
    for (let i = 0; i < cols; i++) {
      widths[i] = Math.max(widths[i], text(row[i]).length);
    }
  }

  const sep = ansi.dim(
    `─${widths.map((w) => '─'.repeat(w)).join('─┼─')}─`,
  );
  const out = [];

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r].map((cell, i) => {
      const t = text(cell);
      const padded =
        i === cols - 1 ? t.padStart(widths[i]) : t.padEnd(widths[i]);
      return r === 0 ? ansi.dim(padded) : style(cell)(padded);
    });
    out.push(` ${cells.join(ansi.dim(' │ '))} `);
    if (r === 0) out.push(sep);
  }

  return out.join('\n');
}

function colorSize(bytes) {
  const text = formatBytes(bytes);
  if (bytes >= 5 * 1024) return { text, style: ansi.yellow };
  if (bytes >= 1024) return { text, style: ansi.white };
  return { text, style: ansi.green };
}

function generateLocalReport(current) {
  const groups = groupByPackage(current);
  const lines = [];

  for (const [pkg, entries] of groups) {
    lines.push('');
    lines.push(ansi.bold(`@videojs/${pkg}`));

    const hasCategories = entries.some((e) => e.category);

    if (hasCategories) {
      const byCategory = new Map();
      for (const entry of entries) {
        const cat = entry.category;
        if (!cat) continue;
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push(entry);
      }

      for (const cat of CATEGORY_ORDER) {
        const catEntries = byCategory.get(cat);
        if (!catEntries || catEntries.length === 0) continue;

        const label = CATEGORY_LABELS[cat] ?? cat;
        const isSkin = cat === 'skin';
        const hasLazy = catEntries.some((entry) => lazySize(entry) > 0);

        lines.push('');
        lines.push(`  ${ansi.dim(label)}`);

        const header = isSkin
          ? hasLazy
            ? ['Entry', 'Type', 'Initial', 'Lazy']
            : ['Entry', 'Type', 'Initial']
          : hasLazy
            ? ['Entry', 'Initial', 'Lazy']
            : ['Entry', 'Initial'];
        const rows = [header];

        for (const entry of catEntries) {
          const subpath =
            entry.name.replace(`@videojs/${pkg}`, '') || '.';
          const fmt = entry.format ?? 'js';
          if (isSkin) {
            const row = [
              { text: subpath, style: ansi.cyan },
              { text: fmt, style: ansi.dim },
              colorSize(entry.size),
            ];
            if (hasLazy) row.push(colorSize(lazySize(entry)));
            rows.push(row);
          } else {
            const row = [
              { text: subpath, style: ansi.cyan },
              colorSize(entry.size),
            ];
            if (hasLazy) row.push(colorSize(lazySize(entry)));
            rows.push(row);
          }
        }

        lines.push(printTable(rows));
      }
    } else {
      const hasLazy = entries.some((entry) => lazySize(entry) > 0);
      const rows = [
        hasLazy ? ['Entry', 'Initial', 'Lazy'] : ['Entry', 'Initial'],
      ];
      for (const entry of entries) {
        const subpath =
          entry.name.replace(`@videojs/${pkg}`, '') || '.';
        const row = [
          { text: subpath, style: ansi.cyan },
          colorSize(entry.size),
        ];
        if (hasLazy) row.push(colorSize(lazySize(entry)));
        rows.push(row);
      }
      lines.push(printTable(rows));
    }
  }

  lines.push('');
  lines.push(
    ansi.dim(
      'Initial sizes are minified + brotli; lazy chunks are shown separately.',
    ),
  );
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);

  const prIndex = args.indexOf('--pr');
  const baseIndex = args.indexOf('--base');

  if (prIndex === -1) {
    // Read from stdin (piped from bundle-size.js)
    const input = readFileSync('/dev/stdin', 'utf8');
    const current = JSON.parse(input);
    console.log(generateLocalReport(current));
    return;
  }

  const prPath = args[prIndex + 1];
  const current = JSON.parse(readFileSync(prPath, 'utf8'));

  if (baseIndex !== -1) {
    const basePath = args[baseIndex + 1];
    const base = JSON.parse(readFileSync(basePath, 'utf8'));
    console.log(generateComparisonReport(current, base));
  } else {
    console.log(generateLocalReport(current));
  }
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) main();
