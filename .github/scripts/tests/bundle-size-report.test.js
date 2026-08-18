import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateComparisonReport } from '../bundle-size-report.js';

function entry(name, size, extra = {}) {
  return {
    name,
    size,
    type: 'subpath',
    format: 'js',
    ...extra,
  };
}

describe('generateComparisonReport', () => {
  it('reports byte-level initial size changes', () => {
    const base = [entry('@videojs/core/dom', 100)];
    const current = [entry('@videojs/core/dom', 101)];

    const report = generateComparisonReport(current, base);

    assert.match(
      report,
      /\| `\/dom` \| 100 B \| 101 B \| \+1 B \(\+1\.0%\) \| — \|/,
    );
    assert.match(report, /1 small size change/);
    assert.doesNotMatch(report, /@videojs\/core<\/b> — no changes/);
  });

  it('reports lazy-only changes', () => {
    const base = [entry('@videojs/core/dom', 100, { lazySize: 10 })];
    const current = [entry('@videojs/core/dom', 100, { lazySize: 20 })];

    const report = generateComparisonReport(current, base);

    assert.match(
      report,
      /\| `\/dom` \| 100 B \| 100 B \| 0 B \(0%\) \| \+10 B \|/,
    );
  });

  it('reports added and removed entries', () => {
    const base = [entry('@videojs/utils/removed', 50)];
    const current = [entry('@videojs/utils/added', 25)];

    const report = generateComparisonReport(current, base);

    assert.match(report, /\| `\/added` \| — \| 25 B \| new \| — \|/);
    assert.match(
      report,
      /\| `\/removed` \| 50 B \| — \| removed \| — \|/,
    );
  });

  it('highlights changes whose combined initial and lazy delta exceeds the threshold', () => {
    const base = [entry('@videojs/core/dom', 1000, { lazySize: 1000 })];
    const current = [entry('@videojs/core/dom', 1200, { lazySize: 1200 })];

    const report = generateComparisonReport(current, base);

    assert.match(report, /## 🧩 @videojs\/core/);
    assert.doesNotMatch(report, /small size change/);
  });

  it('collapses packages only when their measurements are identical', () => {
    const measurements = [entry('@videojs/store', 200)];

    const report = generateComparisonReport(measurements, measurements);

    assert.match(report, /@videojs\/store<\/b> — no changes/);
  });
});
