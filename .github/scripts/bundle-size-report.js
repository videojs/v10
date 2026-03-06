/**
 * Generates a bundle size report from measurement JSON data.
 *
 * Usage:
 *   node bundle-size-report.js --pr pr-size.json [--base base-size.json]
 *
 * When --base is omitted, generates a local report showing current sizes.
 * When --base is provided, generates a comparison report with diffs.
 *
 * Reads JSON arrays of { name, size, type, category?, format } entries
 * produced by bundle-size.js.
 */

import { readFileSync } from 'node:fs';

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

function statusIcon(current, previous) {
  if (previous === undefined) return '🆕';
  const diff = current - previous;
  if (diff === 0) return '✅';
  if (diff < 0) return '🔽';
  if (previous === 0) return '🔴';
  const pct = (diff / previous) * 100;
  return pct > 10 ? '🔴' : '🔺';
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

    lines.push('<details>');
    lines.push(`<summary><b>${label} (${catEntries.length})</b></summary>`);
    lines.push('');

    if (isSkin) {
      lines.push('| Entry | Type | Size |');
      lines.push('|---|---|--:|');
    } else {
      lines.push('| Entry | Size |');
      lines.push('|---|--:|');
    }

    for (const entry of catEntries) {
      const el = entryLabel(entry.name, pkg);
      const fmt = entry.format ?? 'js';
      if (isSkin) {
        lines.push(`| ${el} | ${fmt} | ${formatBytes(entry.size)} |`);
      } else {
        lines.push(`| ${el} | ${formatBytes(entry.size)} |`);
      }
    }

    if (cat === 'ui') {
      lines.push('');
      lines.push('*Sizes are marginal over the root entry point.*');
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
  lines.push('| Entry | Size |');
  lines.push('|---|--:|');

  for (const entry of entries) {
    const el = entryLabel(entry.name, pkg);
    lines.push(`| ${el} | ${formatBytes(entry.size)} |`);
  }

  lines.push('');
  lines.push('</details>');
  lines.push('');

  return lines;
}

// ---------------------------------------------------------------------------
// Comparison report (CI — PR vs base)
// ---------------------------------------------------------------------------

function generateComparisonReport(current, base) {
  const baseMap = Object.fromEntries(base.map((e) => [e.name, e.size]));
  const groups = groupByPackage(current);

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

  for (const [pkg, entries] of groups) {
    const pkgIcon = pkgIcons[pkg] ?? '📦';
    lines.push(`## ${pkgIcon} @videojs/${pkg}`);
    lines.push('');

    // Only show entries with a meaningful size change (>300 B, must exist in both)
    const changed = entries.filter((e) => {
      const prev = baseMap[e.name];
      if (prev === undefined) return false;
      return Math.abs(e.size - prev) > 300;
    });

    if (changed.length === 0) {
      lines.push('(no changes)');
      lines.push('');
    } else {
      lines.push('| Path | Base | PR | Diff | % | |');
      lines.push('|---|--:|--:|--:|--:|:-:|');

      for (const entry of changed) {
        const el = entryLabel(entry.name, pkg);
        const prev = baseMap[entry.name];
        const d = formatDelta(entry.size, prev);
        const status = statusIcon(entry.size, prev);
        const baseSize = prev !== undefined ? formatBytes(prev) : '—';
        lines.push(
          `| ${el} | ${baseSize} | ${formatBytes(entry.size)} | ${d.bytes} | ${d.pct} | ${status} |`,
        );
      }

      lines.push('');
    }

    // Category breakdowns for packages with categories (html, react)
    const hasCategories = entries.some((e) => e.category);
    if (hasCategories) {
      lines.push(...generateCategoryBreakdowns(entries, pkg));
    } else if (entries.length > 1) {
      // Flat breakdown for other packages with multiple entries
      lines.push(...generateFlatBreakdown(entries, pkg));
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('<details>');
  lines.push('<summary>ℹ️ How to interpret</summary>');
  lines.push('');
  lines.push('All sizes are standalone totals (minified + brotli).');
  lines.push('');
  lines.push('| Icon | Meaning |');
  lines.push('|---|---|');
  lines.push('| ✅ | No change |');
  lines.push('| 🔺 | Increased ≤ 10% |');
  lines.push('| 🔴 | Increased > 10% |');
  lines.push('| 🔽 | Decreased |');
  lines.push('| 🆕 | New (no baseline) |');
  lines.push('');
  lines.push('Run `pnpm size` locally to check current sizes.');
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

        lines.push('');
        lines.push(`  ${ansi.dim(label)}`);

        const header = isSkin
          ? ['Entry', 'Type', 'Size']
          : ['Entry', 'Size'];
        const rows = [header];

        for (const entry of catEntries) {
          const subpath =
            entry.name.replace(`@videojs/${pkg}`, '') || '.';
          const fmt = entry.format ?? 'js';
          if (isSkin) {
            rows.push([
              { text: subpath, style: ansi.cyan },
              { text: fmt, style: ansi.dim },
              colorSize(entry.size),
            ]);
          } else {
            rows.push([
              { text: subpath, style: ansi.cyan },
              colorSize(entry.size),
            ]);
          }
        }

        lines.push(printTable(rows));
      }
    } else {
      const rows = [['Entry', 'Size']];
      for (const entry of entries) {
        const subpath =
          entry.name.replace(`@videojs/${pkg}`, '') || '.';
        rows.push([
          { text: subpath, style: ansi.cyan },
          colorSize(entry.size),
        ]);
      }
      lines.push(printTable(rows));
    }
  }

  lines.push('');
  lines.push(ansi.dim('Sizes are minified + brotli.'));
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

main();
