/**
 * Generates a markdown bundle size report from measurement JSON data.
 *
 * Usage:
 *   node bundle-size-report.js --pr pr-size.json [--base base-size.json]
 *
 * When --base is omitted, generates a report showing current sizes only (no diff).
 * When --base is provided, generates a comparison report with diffs and status icons.
 *
 * Reads JSON arrays of { name, size, type } entries produced by bundle-size.js.
 */

import { readFileSync } from 'node:fs';

const ESC = '\x1b[';
const ansi = {
  bold: (s) => `${ESC}1m${s}${ESC}22m`,
  dim: (s) => `${ESC}2m${s}${ESC}22m`,
  cyan: (s) => `${ESC}36m${s}${ESC}39m`,
  yellow: (s) => `${ESC}33m${s}${ESC}39m`,
  white: (s) => `${ESC}37m${s}${ESC}39m`,
  green: (s) => `${ESC}32m${s}${ESC}39m`,
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function formatDelta(current, previous) {
  if (previous === undefined) return { bytes: '—', pct: '' };
  const diff = current - previous;
  if (diff === 0) return { bytes: '0 B', pct: '0%' };
  const sign = diff > 0 ? '+' : '-';
  const pct = Math.abs((diff / previous) * 100).toFixed(1);
  return {
    bytes: `${sign}${formatBytes(Math.abs(diff))}`,
    pct: `${sign}${pct}%`,
  };
}

function statusIcon(current, previous) {
  if (previous === undefined) return '🆕';
  const diff = current - previous;
  if (diff === 0) return '✅';
  if (diff < 0) return '🔽';
  const pct = (diff / previous) * 100;
  return pct > 10 ? '🔴' : '🔺';
}

function deltaBar(current, previous, maxAbsPct) {
  const width = 8;
  if (previous === undefined || maxAbsPct === 0) return '░'.repeat(width);
  const pct = Math.abs(((current - previous) / previous) * 100);
  const filled = Math.round((pct / maxAbsPct) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Group entries by package: @videojs/utils/* -> utils, @videojs/store/* -> store */
function groupByPackage(entries) {
  const groups = new Map();
  for (const entry of entries) {
    // Skip skin and ui entries from package grouping (they're reported separately)
    if (entry.type === 'skin' || entry.type === 'ui') continue;

    const match = entry.name.match(/^@videojs\/([^/]+)/);
    const pkg = match ? match[1] : 'other';
    if (!groups.has(pkg)) groups.set(pkg, []);
    groups.get(pkg).push(entry);
  }
  return groups;
}

/** Extract skin entries (absolute sizes). */
function getSkinEntries(entries) {
  return entries.filter((e) => e.type === 'skin');
}

/** Extract UI component entries. */
function getUIEntries(entries) {
  return entries.filter((e) => e.type === 'ui');
}

function computePackageData(groups, baseMap) {
  const pkgData = [];
  let grandTotalCurrent = 0;
  let grandTotalBase = 0;

  for (const [pkg, entries] of groups) {
    const rootEntries = entries.filter((e) => e.type === 'root');
    const subEntries = entries.filter((e) => e.type === 'subpath');

    const pkgTotalCurrent =
      rootEntries.reduce((s, e) => s + e.size, 0) +
      subEntries.reduce((s, e) => s + e.size, 0);

    const pkgTotalBase =
      rootEntries.reduce((s, e) => s + (baseMap[e.name] ?? 0), 0) +
      subEntries.reduce((s, e) => s + (baseMap[e.name] ?? 0), 0);

    const hasBase = entries.some((e) => baseMap[e.name] !== undefined);
    grandTotalCurrent += pkgTotalCurrent;
    grandTotalBase += pkgTotalBase;

    pkgData.push({
      pkg,
      entries,
      rootEntries,
      subEntries,
      pkgTotalCurrent,
      pkgTotalBase,
      hasBase,
    });
  }

  return { pkgData, grandTotalCurrent, grandTotalBase };
}

/** Generate a comparison report (PR vs base). */
function generateComparisonReport(current, base) {
  const baseMap = Object.fromEntries(base.map((e) => [e.name, e.size]));
  const groups = groupByPackage(current);
  const { pkgData, grandTotalCurrent, grandTotalBase } = computePackageData(
    groups,
    baseMap,
  );

  const maxAbsPct = Math.max(
    ...pkgData.map((p) => {
      if (!p.hasBase || p.pkgTotalBase === 0) return 0;
      return Math.abs(
        ((p.pkgTotalCurrent - p.pkgTotalBase) / p.pkgTotalBase) * 100,
      );
    }),
  );

  // Overview table
  const overview = [];
  overview.push('| Package | Size | Diff | | % | |');
  overview.push('|---|--:|--:|---|--:|:-:|');

  for (const p of pkgData) {
    const d = formatDelta(
      p.pkgTotalCurrent,
      p.hasBase ? p.pkgTotalBase : undefined,
    );
    const icon = p.hasBase
      ? statusIcon(p.pkgTotalCurrent, p.pkgTotalBase)
      : '';
    const bar = `\`${deltaBar(p.pkgTotalCurrent, p.hasBase ? p.pkgTotalBase : undefined, maxAbsPct)}\``;
    overview.push(
      `| **@videojs/${p.pkg}** | **${formatBytes(p.pkgTotalCurrent)}** | ${p.hasBase ? d.bytes : '—'} | ${bar} | ${p.hasBase ? d.pct : ''} | ${icon} |`,
    );
  }

  // Detail sections — only for packages with multiple entries
  const details = [];
  const pkgsWithSubs = pkgData.filter((p) => p.entries.length > 1);

  if (pkgsWithSubs.length > 0) {
    details.push('#### Entry Breakdown');
    details.push('');
    details.push(
      'Subpath sizes are the additional bytes on top of the root entry point, measured by bundling root + subpath together and subtracting the root-only size.',
    );
    details.push('');

    for (const p of pkgsWithSubs) {
      const {
        pkg,
        rootEntries,
        subEntries,
        pkgTotalCurrent,
        pkgTotalBase,
        hasBase,
      } = p;

      details.push('<details>');
      details.push(`<summary><code>@videojs/${pkg}</code></summary>`);
      details.push('');
      details.push('| Entry | Base | PR | Diff | % | |');
      details.push('|---|--:|--:|--:|--:|:-:|');

      for (const entry of [...rootEntries, ...subEntries]) {
        const displayName =
          entry.name.replace(`@videojs/${pkg}`, '') || '.';
        const label = displayName === '.' ? displayName : `.${displayName}`;
        const prev = baseMap[entry.name];
        const d = formatDelta(entry.size, prev);
        details.push(
          `| \`${label}\` | ${prev !== undefined ? formatBytes(prev) : '—'} | **${formatBytes(entry.size)}** | ${d.bytes} | ${d.pct} | ${statusIcon(entry.size, prev)} |`,
        );
      }

      if (rootEntries.length + subEntries.length > 1) {
        const d = formatDelta(
          pkgTotalCurrent,
          hasBase ? pkgTotalBase : undefined,
        );
        details.push(
          `| **total** | **${hasBase ? formatBytes(pkgTotalBase) : '—'}** | **${formatBytes(pkgTotalCurrent)}** | **${hasBase ? d.bytes : '—'}** | **${hasBase ? d.pct : ''}** | |`,
        );
      }

      details.push('');
      details.push('</details>');
      details.push('');
    }
  }

  // Skins section (absolute sizes)
  const skinEntries = getSkinEntries(current);
  const skinsSection = [];

  if (skinEntries.length > 0) {
    skinsSection.push('#### Skins');
    skinsSection.push('');
    skinsSection.push(
      'Absolute bundle sizes when importing a skin (includes all dependencies).',
    );
    skinsSection.push('');
    skinsSection.push('| Skin | Base | PR | Diff | % | |');
    skinsSection.push('|---|--:|--:|--:|--:|:-:|');

    for (const entry of skinEntries) {
      // Strip the ~skin suffix for display, keep it for lookup
      const skinName = entry.name.replace('@videojs/html/', '').replace('~skin', '');
      const prev = baseMap[entry.name];
      const d = formatDelta(entry.size, prev);
      skinsSection.push(
        `| \`${skinName}\` | ${prev !== undefined ? formatBytes(prev) : '—'} | **${formatBytes(entry.size)}** | ${d.bytes} | ${d.pct} | ${statusIcon(entry.size, prev)} |`,
      );
    }
    skinsSection.push('');
  }

  // UI Components section
  const uiEntries = getUIEntries(current);
  const uiSection = [];

  if (uiEntries.length > 0) {
    uiSection.push('#### UI Components');
    uiSection.push('');
    uiSection.push(
      'Marginal size of each UI component (additional bytes on top of `@videojs/html`).',
    );
    uiSection.push('');
    uiSection.push('<details>');
    uiSection.push('<summary>Component breakdown</summary>');
    uiSection.push('');
    uiSection.push('| Component | Base | PR | Diff | % | |');
    uiSection.push('|---|--:|--:|--:|--:|:-:|');

    // Sort by size (largest first)
    const sortedUI = [...uiEntries].sort((a, b) => b.size - a.size);

    for (const entry of sortedUI) {
      const componentName = entry.name.replace('@videojs/html/ui/', '');
      const prev = baseMap[entry.name];
      const d = formatDelta(entry.size, prev);
      uiSection.push(
        `| \`${componentName}\` | ${prev !== undefined ? formatBytes(prev) : '—'} | **${formatBytes(entry.size)}** | ${d.bytes} | ${d.pct} | ${statusIcon(entry.size, prev)} |`,
      );
    }

    const uiTotal = uiEntries.reduce((s, e) => s + e.size, 0);
    const uiBaseTotal = uiEntries.reduce(
      (s, e) => s + (baseMap[e.name] ?? 0),
      0,
    );
    const hasUIBase = uiEntries.some((e) => baseMap[e.name] !== undefined);
    const uiDelta = formatDelta(uiTotal, hasUIBase ? uiBaseTotal : undefined);
    uiSection.push(
      `| **total** | **${hasUIBase ? formatBytes(uiBaseTotal) : '—'}** | **${formatBytes(uiTotal)}** | **${hasUIBase ? uiDelta.bytes : '—'}** | **${hasUIBase ? uiDelta.pct : ''}** | |`,
    );

    uiSection.push('');
    uiSection.push('</details>');
    uiSection.push('');
  }

  const grandDelta = formatDelta(grandTotalCurrent, grandTotalBase);

  const marker = '<!-- bundle-size-report -->';
  return [
    marker,
    '### 📦 Bundle Size Report',
    '',
    ...overview,
    '',
    `**Total: ${formatBytes(grandTotalCurrent)}**${grandTotalBase ? ` · ${grandDelta.bytes} · ${grandDelta.pct}` : ''}`,
    '',
    '---',
    '',
    ...details,
    ...skinsSection,
    ...uiSection,
    '---',
    '',
    '<details>',
    '<summary>ℹ️ How to interpret</summary>',
    '',
    'Sizes are minified + brotli, measured with esbuild.',
    'Package totals are computed as root size + marginal subpath costs.',
    'Subpath marginal cost = (root + subpath bundled together) − root alone.',
    'Skin sizes are absolute (total bundle size when importing).',
    '',
    '| Icon | Meaning |',
    '|---|---|',
    '| ✅ | No change |',
    '| 🔺 | Increased ≤ 10% |',
    '| 🔴 | Increased > 10% |',
    '| 🔽 | Decreased |',
    '| 🆕 | New (no baseline) |',
    '',
    'Run `pnpm size` locally to check current sizes.',
    '</details>',
  ].join('\n');
}

/**
 * Render rows as a padded, aligned table for terminal output.
 *
 * Each row is an array of cell values. Cells can be plain strings or
 * `{ text, style }` objects where `style` is a ansi chain (e.g. ansi.bold).
 * Alignment and padding use the plain text width; ANSI codes are ignored.
 *
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
  const lines = [];

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r].map((cell, i) => {
      const t = text(cell);
      const padded =
        i === cols - 1 ? t.padStart(widths[i]) : t.padEnd(widths[i]);
      // Header row is dim, data rows use their own style
      return r === 0 ? ansi.dim(padded) : style(cell)(padded);
    });
    lines.push(` ${cells.join(ansi.dim(' │ '))} `);
    if (r === 0) lines.push(sep);
  }

  return lines.join('\n');
}

/** Color a size value based on magnitude. */
function colorSize(bytes) {
  const text = formatBytes(bytes);
  if (bytes >= 5 * 1024) return { text, style: ansi.yellow };
  if (bytes >= 1024) return { text, style: ansi.white };
  return { text, style: ansi.green };
}

/** Generate a local-only report (no base comparison). */
function generateLocalReport(current) {
  const groups = groupByPackage(current);

  const overviewRows = [['Package', 'Size']];
  let grandTotal = 0;
  const pkgsWithSubs = [];

  for (const [pkg, entries] of groups) {
    const rootEntries = entries.filter((e) => e.type === 'root');
    const subEntries = entries.filter((e) => e.type === 'subpath');

    const pkgTotal =
      rootEntries.reduce((s, e) => s + e.size, 0) +
      subEntries.reduce((s, e) => s + e.size, 0);

    grandTotal += pkgTotal;
    overviewRows.push([
      { text: `@videojs/${pkg}`, style: ansi.bold },
      colorSize(pkgTotal),
    ]);

    if (entries.length > 1) {
      pkgsWithSubs.push({ pkg, rootEntries, subEntries, pkgTotal });
    }
  }

  const lines = [];
  lines.push('');
  lines.push(printTable(overviewRows));
  lines.push('');
  lines.push(ansi.bold(`Total: ${formatBytes(grandTotal)}`));

  if (pkgsWithSubs.length > 0) {
    for (const { pkg, rootEntries, subEntries, pkgTotal } of pkgsWithSubs) {
      lines.push('');
      lines.push(ansi.bold(`@videojs/${pkg}`));

      const rows = [['Entry', 'Size']];
      for (const entry of [...rootEntries, ...subEntries]) {
        const displayName =
          entry.name.replace(`@videojs/${pkg}`, '') || '.';
        const label = displayName === '.' ? displayName : `.${displayName}`;
        rows.push([
          { text: label, style: ansi.cyan },
          colorSize(entry.size),
        ]);
      }
      rows.push([
        { text: 'total', style: ansi.bold },
        { text: formatBytes(pkgTotal), style: ansi.bold },
      ]);

      lines.push(printTable(rows));
    }
  }

  // Skins section
  const skinEntries = getSkinEntries(current);
  if (skinEntries.length > 0) {
    lines.push('');
    lines.push(ansi.bold('Skins (absolute sizes)'));

    const skinRows = [['Skin', 'Size']];
    for (const entry of skinEntries) {
      // Strip the ~skin suffix for display
      const skinName = entry.name.replace('@videojs/html/', '').replace('~skin', '');
      skinRows.push([{ text: skinName, style: ansi.cyan }, colorSize(entry.size)]);
    }
    lines.push(printTable(skinRows));
  }

  // UI Components section
  const uiEntries = getUIEntries(current);
  if (uiEntries.length > 0) {
    lines.push('');
    lines.push(ansi.bold('UI Components (marginal sizes)'));

    const uiRows = [['Component', 'Size']];
    // Sort by size (largest first)
    const sortedUI = [...uiEntries].sort((a, b) => b.size - a.size);
    for (const entry of sortedUI) {
      const componentName = entry.name.replace('@videojs/html/ui/', '');
      uiRows.push([
        { text: componentName, style: ansi.cyan },
        colorSize(entry.size),
      ]);
    }
    const uiTotal = uiEntries.reduce((s, e) => s + e.size, 0);
    uiRows.push([
      { text: 'total', style: ansi.bold },
      { text: formatBytes(uiTotal), style: ansi.bold },
    ]);
    lines.push(printTable(uiRows));
  }

  lines.push('');
  lines.push(ansi.dim('Sizes are minified + brotli.'));
  lines.push('');

  return lines.join('\n');
}

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
