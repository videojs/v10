/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                    API DOCS BUILDER — END-TO-END SPEC                      │
 * │                                                                            │
 * │  This file IS the specification for the API docs builder pipeline.         │
 * │  It exercises every pattern the builder must handle, using a mock          │
 * │  monorepo under fixtures/monorepo/. If you're an agent trying to          │
 * │  understand how the builder works: read this file. The fixtures are        │
 * │  the inputs, the expected JSON objects are the outputs.                    │
 * │                                                                            │
 * │  The builder is a black box: given TypeScript source files following       │
 * │  specific conventions, it produces JSON reference objects. These tests     │
 * │  verify the contract between input conventions and output shape.           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * FIXTURE LAYOUT (under fixtures/monorepo/):
 *
 * Components (packages/core/src/core/ui/):
 *   toggle-button/  — Single-part component. Exercises: props, state, data-attrs,
 *                     CSS vars, defaultProps, HTML element, type abbreviation,
 *                     @ignore skipping, ref auto-skip, function-typed props.
 *   gauge/          — Multi-part component. Exercises: primary part detection via
 *                     Core instantiation, sub-parts with/without HTML elements,
 *                     React-only parts (no platforms.html), sub-part data-attr
 *                     inheritance (stateAttrMap heuristic), non-boolean type
 *                     inference (number, string literal union via type alias).
 *   slider/         — Base multi-part component. Exercises: base component whose
 *                     parts are re-exported by domain variants.
 *   volume-slider/  — Domain variant. Exercises: re-exported parts from slider,
 *                     origin-based element + data-attr resolution, re-exported
 *                     parts are never primary, always multi-part (no fallback).
 *
 * Utils (already existing fixtures for hooks, controllers, selectors, etc.):
 *   Exercises: hook discovery, controller discovery, @public context,
 *   create* factory, mixin display name stripping, selector discovery,
 *   @label overloads, slug collision (react vs html create-player),
 *   framework assignment.
 */
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateComponentReferences } from '../pipeline';
import { getUtilEntries, type UtilEntry } from '../util-handler';

const FIXTURE_ROOT = path.resolve(import.meta.dirname, 'fixtures/monorepo');

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT PIPELINE
// ═══════════════════════════════════════════════════════════════════════

describe('Component pipeline (end-to-end)', () => {
  // Run the full pipeline once and reuse results across tests.
  const results = generateComponentReferences(FIXTURE_ROOT);

  function findComponent(name: string) {
    return results.find((r) => r.name === name);
  }

  // ─────────────────────────────────────────────────────────────────
  // SINGLE-PART COMPONENT: ToggleButton
  // ─────────────────────────────────────────────────────────────────
  //
  // A single-part component is the simplest case. The builder merges
  // data from three source files into one flat reference object:
  //   - Core file → Props interface, State interface, defaultProps
  //   - Data-attrs file → data attribute names + JSDoc descriptions
  //   - CSS-vars file → CSS custom property names + descriptions
  //   - HTML element file → tagName for platforms.html
  //
  // Key behaviors tested:
  //   - Props with `@ignore` JSDoc are excluded from output
  //   - Props named `ref` are auto-excluded (React internal)
  //   - Function-typed props get abbreviated ("function") with detailedType
  //   - Union props with function members get "type | function" abbreviation
  //   - defaultProps values are merged as string representations
  //   - Boolean data-attrs have NO type field (presence/absence convention)
  //   - CSS custom properties appear in cssCustomProperties
  //   - platforms.html is present when an HTML element file exists
  //   - No `parts` field on single-part components

  describe('ToggleButton (single-part)', () => {
    it('produces the expected JSON reference', () => {
      const toggle = findComponent('ToggleButton');
      expect(toggle).toBeDefined();

      const ref = toggle!.reference;

      // Top-level shape
      expect(ref.name).toBe('ToggleButton');
      expect(ref.parts).toBeUndefined();

      // ── Props ──
      // `ref` prop is auto-skipped. `_internalFlag` has @ignore and is skipped.
      // What remains: disabled, label, onPressedChange.
      expect(Object.keys(ref.props)).toEqual(expect.arrayContaining(['disabled', 'label', 'onPressedChange']));
      expect(ref.props['ref' as keyof typeof ref.props]).toBeUndefined();
      expect(ref.props['_internalFlag' as keyof typeof ref.props]).toBeUndefined();

      // disabled: simple boolean, has defaultProps value.
      // Props that are non-optional in the interface have required: true,
      // even when they have a runtime default (defaultProps is separate from optionality).
      expect(ref.props.disabled).toEqual({
        type: 'boolean',
        description: 'Whether the button is disabled.',
        default: 'false',
        required: true,
      });

      // label: union with function → abbreviated to "string | function"
      // defaultProps '' → "''"
      expect(ref.props.label).toMatchObject({
        type: 'string | function',
        description: 'Custom label for the button.',
        default: "''",
      });
      // detailedType shows the full function signature
      expect(ref.props.label!.detailedType).toBeDefined();
      expect(ref.props.label!.detailedType).toContain('=>');

      // onPressedChange: pure function → abbreviated to "function"
      expect(ref.props.onPressedChange).toMatchObject({
        type: 'function',
        description: 'Callback when pressed state changes.',
      });
      expect(ref.props.onPressedChange!.detailedType).toBeDefined();

      // ── State ──
      expect(ref.state.pressed).toEqual({
        type: 'boolean',
        description: 'Whether the toggle is pressed.',
      });
      expect(ref.state.disabled).toEqual({
        type: 'boolean',
        description: 'Whether the button is disabled.',
      });

      // ── Data attributes ──
      // Boolean state types → type field is OMITTED (presence/absence convention).
      expect(ref.dataAttributes['data-pressed']).toEqual({
        description: 'Present when the toggle is pressed.',
      });
      expect(ref.dataAttributes['data-disabled']).toEqual({
        description: 'Present when the button is disabled.',
      });

      // ── CSS custom properties ──
      expect(ref.cssCustomProperties['--media-toggle-pressed-bg']).toEqual({
        description: 'Background color when pressed.',
      });
      expect(ref.cssCustomProperties['--media-toggle-transition']).toEqual({
        description: 'Transition duration for the toggle animation.',
      });

      // ── Platforms ──
      // HTML element exists → platforms.html with tagName
      expect(ref.platforms.html).toEqual({ tagName: 'media-toggle-button' });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // MULTI-PART COMPONENT: Gauge
  // ─────────────────────────────────────────────────────────────────
  //
  // A multi-part component is detected when `index.parts.ts` exists
  // in the React package. The top-level reference has EMPTY props,
  // state, dataAttributes, cssCustomProperties, and platforms. All
  // meaningful data lives in the `parts` record.
  //
  // Parts are discovered from index.parts.ts exports:
  //   - PRIMARY PART: The part whose React source instantiates the
  //     component's own Core class (matches `new {Name}Core\b`).
  //     Gets: shared core Props/State, data-attrs, CSS vars, root tagName.
  //   - SUB-PARTS: All other parts. Get: their own tagName (if element
  //     file exists), description from React JSDoc, shared data-attrs
  //     (only if React source references `stateAttrMap`), and custom
  //     React props from `{LocalName}Props` interface.
  //   - REACT-ONLY PARTS: Sub-parts with no matching HTML element file.
  //     Get platforms.react but NOT platforms.html.
  //
  // Non-boolean data-attr types are inferred from StateAttrMap<State>:
  //   - number → type: "number"
  //   - string literal union → type: "'empty' | 'partial' | 'full'"
  //   - type alias → expanded to literals (FillLevel → 'empty' | ...)
  //   - boolean → type field OMITTED

  describe('Gauge (multi-part)', () => {
    it('has empty top-level and parts record', () => {
      const gauge = findComponent('Gauge');
      expect(gauge).toBeDefined();

      const ref = gauge!.reference;

      // Top-level is empty for multi-part components
      expect(ref.props).toEqual({});
      expect(ref.state).toEqual({});
      expect(ref.dataAttributes).toEqual({});
      expect(ref.cssCustomProperties).toEqual({});
      expect(ref.platforms).toEqual({});

      // Parts record exists
      expect(ref.parts).toBeDefined();
      expect(Object.keys(ref.parts!)).toEqual(expect.arrayContaining(['indicator', 'track', 'fill', 'label']));
    });

    it('primary part (Indicator) gets core props, state, data-attrs, CSS vars', () => {
      const parts = findComponent('Gauge')!.reference.parts!;
      const indicator = parts.indicator!;

      expect(indicator.name).toBe('Indicator');
      expect(indicator.description).toBe('A visual indicator for the current value. Renders a `<span>` element.');

      // Props from shared core (GaugeProps), with defaultProps merged
      expect(indicator.props.min).toMatchObject({ type: 'number', default: '0' });
      expect(indicator.props.max).toMatchObject({ type: 'number', default: '100' });
      expect(indicator.props.label).toMatchObject({
        type: 'string | function',
        default: "''",
      });

      // State from shared core (GaugeState)
      expect(indicator.state.percentage).toMatchObject({
        type: 'number',
        description: 'Current value as a percentage (0\u20131).',
      });

      // Data attributes with non-boolean type inference
      expect(indicator.dataAttributes['data-percentage']).toMatchObject({
        description: 'Current percentage as a string.',
        type: 'number',
      });
      expect(indicator.dataAttributes['data-fill-level']).toMatchObject({
        description: 'The fill level.',
      });
      // FillLevel type alias → expanded to string literal union
      const fillType = indicator.dataAttributes['data-fill-level']!.type;
      expect(fillType).toBeDefined();
      expect(fillType).toContain("'empty'");
      expect(fillType).toContain("'partial'");
      expect(fillType).toContain("'full'");

      // CSS vars from shared css-vars file
      expect(indicator.cssCustomProperties['--media-gauge-fill']).toEqual({
        description: 'The fill color of the gauge.',
      });

      // Platforms: both html and react
      expect(indicator.platforms.html).toEqual({ tagName: 'media-gauge' });
      expect(indicator.platforms.react).toEqual({});
    });

    it('sub-part (Track) gets its own tagName, empty props/state', () => {
      const track = findComponent('Gauge')!.reference.parts!.track!;

      expect(track.name).toBe('Track');
      expect(track.description).toBe('The track area of the gauge. Renders a `<div>` element.');
      expect(track.props).toEqual({});
      expect(track.state).toEqual({});
      expect(track.dataAttributes).toEqual({});
      expect(track.cssCustomProperties).toEqual({});

      // Has both HTML and React platforms
      expect(track.platforms.html).toEqual({ tagName: 'media-gauge-track' });
      expect(track.platforms.react).toEqual({});
    });

    it('sub-part (Fill) inherits shared data-attrs via stateAttrMap heuristic', () => {
      const fill = findComponent('Gauge')!.reference.parts!.fill!;

      expect(fill.name).toBe('Fill');
      // Sub-part custom React props: extracted from `FillProps` interface.
      // `children` is auto-excluded by the builder.
      expect(fill.props.color).toMatchObject({ type: 'string' });
      expect(fill.props.children).toBeUndefined();
      expect(fill.state).toEqual({});

      // Fill's React source references `stateAttrMap`, so it gets the
      // component's shared data-attrs from gauge-data-attrs.ts
      expect(Object.keys(fill.dataAttributes).length).toBeGreaterThan(0);
      expect(fill.dataAttributes['data-percentage']).toBeDefined();
      expect(fill.dataAttributes['data-fill-level']).toBeDefined();

      expect(fill.platforms.html).toEqual({ tagName: 'media-gauge-fill' });
      expect(fill.platforms.react).toEqual({});
    });

    it('React-only sub-part (Label) has no platforms.html', () => {
      const label = findComponent('Gauge')!.reference.parts!.label!;

      expect(label.name).toBe('Label');
      expect(label.description).toBe('An accessible label for the gauge value. Renders a `<span>` element.');

      // React-only: has platforms.react but NOT platforms.html
      expect(label.platforms.react).toEqual({});
      expect(label.platforms.html).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // MULTI-PART WITH RE-EXPORTS: VolumeSlider
  // ─────────────────────────────────────────────────────────────────
  //
  // Domain variant components like VolumeSlider re-export parts from
  // a base component (Slider). The builder resolves re-exports:
  //   - Parses the origin's index.parts.ts to find the original export
  //   - Derives element file paths from the ORIGIN component
  //   - Data-attrs come from the ORIGIN component's data-attrs file
  //   - Re-exported parts are NEVER primary
  //   - Components with re-exported parts always produce multi-part
  //     output (no single-part fallback, even if only 1 local export)

  describe('VolumeSlider (multi-part with re-exports)', () => {
    it('has empty top-level and parts from both local and re-exported sources', () => {
      const vs = findComponent('VolumeSlider');
      expect(vs).toBeDefined();

      const ref = vs!.reference;
      expect(ref.props).toEqual({});
      expect(ref.state).toEqual({});
      expect(ref.parts).toBeDefined();

      // Root is local, Thumb and Track are re-exported from slider
      expect(ref.parts!.root).toBeDefined();
      expect(ref.parts!.thumb).toBeDefined();
      expect(ref.parts!.track).toBeDefined();
    });

    it('local primary part (Root) gets VolumeSlider core data', () => {
      const root = findComponent('VolumeSlider')!.reference.parts!.root!;

      expect(root.name).toBe('Root');
      // Props come from VolumeSliderProps
      expect(root.props.orientation).toBeDefined();
      // State comes from VolumeSliderState
      expect(root.state.volume).toBeDefined();
      // HTML tag comes from volume-slider-element.ts
      expect(root.platforms.html).toEqual({ tagName: 'media-volume-slider' });
      expect(root.platforms.react).toEqual({});
    });

    it('re-exported sub-part (Thumb) resolves from slider origin', () => {
      const thumb = findComponent('VolumeSlider')!.reference.parts!.thumb!;

      expect(thumb.name).toBe('Thumb');
      // HTML tag comes from SLIDER's element file (slider-thumb-element.ts),
      // not volume-slider's directory
      expect(thumb.platforms.html).toEqual({ tagName: 'media-slider-thumb' });
      expect(thumb.platforms.react).toEqual({});

      // Data-attrs come from SLIDER's data-attrs file because the origin
      // React source (slider-thumb.tsx) references stateAttrMap
      expect(Object.keys(thumb.dataAttributes).length).toBeGreaterThan(0);
      expect(thumb.dataAttributes['data-value']).toBeDefined();
      expect(thumb.dataAttributes['data-dragging']).toBeDefined();
    });

    it('re-exported sub-part (Track) with no stateAttrMap gets empty data-attrs', () => {
      const track = findComponent('VolumeSlider')!.reference.parts!.track!;

      expect(track.name).toBe('Track');
      // slider-track.tsx does NOT reference stateAttrMap, so no data-attrs
      expect(track.dataAttributes).toEqual({});
      // HTML tag from slider's track element
      expect(track.platforms.html).toEqual({ tagName: 'media-slider-track' });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // BASE COMPONENT: Slider
  // ─────────────────────────────────────────────────────────────────
  //
  // The slider base is also discovered as its own component.
  // It has index.parts.ts with 3 local parts (Root, Thumb, Track).
  // This tests that the base component is independently valid.

  describe('Slider (base multi-part)', () => {
    it('is discovered and has parts', () => {
      const slider = findComponent('Slider');
      expect(slider).toBeDefined();

      const ref = slider!.reference;
      expect(ref.parts).toBeDefined();

      // Root is primary (instantiates SliderCore)
      expect(ref.parts!.root).toBeDefined();
      expect(ref.parts!.root!.props.min).toBeDefined();
      expect(ref.parts!.root!.props.max).toBeDefined();
      expect(ref.parts!.root!.state.value).toBeDefined();
      expect(ref.parts!.root!.state.dragging).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CROSS-CUTTING CONVENTIONS
  // ─────────────────────────────────────────────────────────────────

  describe('Cross-cutting conventions', () => {
    it('all components are discovered from core/ui directories', () => {
      const names = results.map((r) => r.name).sort();
      expect(names).toEqual(expect.arrayContaining(['Gauge', 'PiPButton', 'Slider', 'ToggleButton', 'VolumeSlider']));
    });

    it('kebab name matches directory name', () => {
      expect(findComponent('ToggleButton')!.kebab).toBe('toggle-button');
      expect(findComponent('Gauge')!.kebab).toBe('gauge');
      expect(findComponent('Slider')!.kebab).toBe('slider');
      expect(findComponent('VolumeSlider')!.kebab).toBe('volume-slider');
    });

    it('NAME_OVERRIDES: pip-button → PiPButton (not PipButton)', () => {
      // The NAME_OVERRIDES map handles cases where standard kebab-to-PascalCase
      // conversion is wrong. "pip-button" would normally become "PipButton",
      // but the override maps it to "PiPButton".
      const pip = findComponent('PiPButton');
      expect(pip).toBeDefined();
      expect(pip!.kebab).toBe('pip-button');
      expect(pip!.reference.name).toBe('PiPButton');
      // Props use the overridden name for interface lookup (PiPButtonProps)
      expect(pip!.reference.props.disabled).toBeDefined();
      expect(pip!.reference.state.active).toBeDefined();
    });

    it('primary part appears first in parts record (sorted by isPrimary)', () => {
      const gaugeParts = Object.keys(findComponent('Gauge')!.reference.parts!);
      expect(gaugeParts[0]).toBe('indicator');

      const vsParts = Object.keys(findComponent('VolumeSlider')!.reference.parts!);
      expect(vsParts[0]).toBe('root');
    });

    it('props are sorted: required first, then alphabetical', () => {
      // All ToggleButton props are required (non-optional in the interface),
      // so they should be purely alphabetical within the required group.
      const toggleProps = Object.keys(findComponent('ToggleButton')!.reference.props);
      const sorted = [...toggleProps].sort((a, b) => a.localeCompare(b));
      expect(toggleProps).toEqual(sorted);
    });

    it('optional fields are omitted from JSON when undefined', () => {
      const ref = findComponent('ToggleButton')!.reference;

      // disabled has no detailedType (simple boolean, no abbreviation)
      expect('detailedType' in ref.props.disabled!).toBe(false);

      // Boolean data-attrs have no type field
      expect('type' in ref.dataAttributes['data-pressed']!).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// UTIL PIPELINE
// ═══════════════════════════════════════════════════════════════════════
//
// The util pipeline scans fixed entry points for exports matching
// naming conventions (use*, select*, create*, *Controller) or @public
// JSDoc. Each export produces a UtilReference JSON with overloads.
//
// Key behaviors:
//   - Hooks (use*): discovered from React entry points, framework: "react"
//   - Controllers (*Controller): discovered from HTML entry points, framework: "html"
//   - Selectors (select*): framework-agnostic (null)
//   - Factories (create*): framework depends on entry point
//   - @public exports: explicit inclusion regardless of naming
//   - create*Mixin: display name strips "create" prefix
//   - Slug collisions: React keeps bare slug, HTML gets prefixed with "html-"
//   - Multi-overload functions: each overload is preserved in the overloads array
//   - @label JSDoc: becomes the overload's label field
//   - Controller params: "- " prefix stripped from @param descriptions

describe('Util pipeline (end-to-end)', () => {
  const entries = getUtilEntries(FIXTURE_ROOT);

  function findByName(name: string, framework?: 'react' | 'html' | null): UtilEntry | undefined {
    return entries.find((e) => e.data.name === name && (framework === undefined || e.framework === framework));
  }

  // ─────────────────────────────────────────────────────────────────
  // DISCOVERY & FRAMEWORK ASSIGNMENT
  // ─────────────────────────────────────────────────────────────────
  //
  // Exports are discovered by scanning entry point files and their
  // local re-exports. The framework is determined by which entry
  // point the export was found in.

  describe('Discovery', () => {
    it('discovers hooks from React entry points', () => {
      expect(findByName('usePlayer', 'react')).toBeDefined();
      expect(findByName('useStore', 'react')).toBeDefined();
      expect(findByName('useFormat', 'react')).toBeDefined();
    });

    it('discovers controllers from HTML entry points', () => {
      expect(findByName('PlayerController', 'html')).toBeDefined();
      expect(findByName('SnapshotController', 'html')).toBeDefined();
    });

    it('discovers selectors as framework-agnostic (null)', () => {
      for (const name of ['selectPlayback', 'selectVolume', 'selectTime']) {
        const entry = findByName(name, null);
        expect(entry, `expected ${name} to be framework-agnostic`).toBeDefined();
        expect(entry!.framework).toBeNull();
      }
    });

    it('discovers @public exports (mergeProps, playerContext)', () => {
      expect(findByName('mergeProps', 'react')).toBeDefined();
      expect(findByName('playerContext', 'html')).toBeDefined();
    });

    it('discovers factories from both React and HTML', () => {
      expect(findByName('createPlayer', 'react')).toBeDefined();
      expect(findByName('createPlayer', 'html')).toBeDefined();
      expect(findByName('createSelector', null)).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DISPLAY NAME & SLUG
  // ─────────────────────────────────────────────────────────────────
  //
  // Display names are the export name as-is, EXCEPT create*Mixin
  // factories which strip the "create" prefix.
  // Slugs are kebab-case of the display name. On collision, React
  // keeps the bare slug and HTML gets "html-" prefixed.

  describe('Display name & slug', () => {
    it('strips "create" prefix from mixin display names', () => {
      const mixin = findByName('ContainerMixin', 'html');
      expect(mixin).toBeDefined();
      expect(mixin!.slug).toBe('container-mixin');
    });

    it('resolves slug collisions: React bare, HTML prefixed', () => {
      const reactCreate = entries.find((e) => e.slug === 'create-player' && e.framework === 'react');
      const htmlCreate = entries.find((e) => e.slug === 'html-create-player' && e.framework === 'html');

      expect(reactCreate).toBeDefined();
      expect(htmlCreate).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // OVERLOADS
  // ─────────────────────────────────────────────────────────────────
  //
  // When a function or constructor has multiple signatures, each
  // becomes a separate entry in the overloads array.
  // @label JSDoc tags on overload signatures become the label field.

  describe('Overloads', () => {
    it('preserves multiple overload signatures', () => {
      const usePlayer = findByName('usePlayer', 'react');
      expect(usePlayer!.data.overloads.length).toBe(2);

      const useStore = findByName('useStore', 'react');
      expect(useStore!.data.overloads.length).toBe(2);
    });

    it('extracts @label from overload JSDoc', () => {
      const useFormat = findByName('useFormat', 'react');
      expect(useFormat!.data.overloads[0]!.label).toBe('Number');
      expect(useFormat!.data.overloads[1]!.label).toBe('String');
    });

    it('omits label when @label is absent', () => {
      const useStore = findByName('useStore', 'react');
      expect(useStore!.data.overloads[0]!.label).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // EXTRACTION SHAPE
  // ─────────────────────────────────────────────────────────────────
  //
  // Each util reference has: name, description?, overloads[].
  // Each overload has: label?, description?, parameters, returnValue.
  // Parameters and returnValue follow the same PropDef/StateDef shape
  // used by component references.

  describe('Extraction shape', () => {
    it('hooks have description and overloads with parameters + returnValue', () => {
      const usePlayer = findByName('usePlayer', 'react');
      expect(usePlayer!.data.description).toBeDefined();

      const overload = usePlayer!.data.overloads[0]!;
      expect(overload.returnValue).toBeDefined();
      expect(overload.returnValue.type).toBeDefined();
    });

    it('controllers have constructor params and public members as returnValue.fields', () => {
      const snapshot = findByName('SnapshotController', 'html');
      expect(snapshot!.data.description).toBeDefined();

      const overload = snapshot!.data.overloads[0]!;
      // Constructor parameters
      expect(overload.parameters.host).toBeDefined();

      // Return value type includes class name with type params
      expect(overload.returnValue.type).toContain('SnapshotController');

      // Public members as fields
      expect(overload.returnValue.fields).toBeDefined();
      expect(overload.returnValue.fields!.value).toBeDefined();
      expect(overload.returnValue.fields!.track).toBeDefined();
    });

    it('controller param descriptions have "- " prefix stripped', () => {
      const snapshot = findByName('SnapshotController', 'html');
      const hostParam = snapshot!.data.overloads[0]!.parameters.host;
      expect(hostParam!.description).toBe('The host element.');
      expect(hostParam!.description).not.toMatch(/^-\s/);
    });

    it('contexts (@public non-function) have empty parameters and type as returnValue', () => {
      const ctx = findByName('playerContext', 'html');
      expect(ctx!.data.description).toBeDefined();

      const overload = ctx!.data.overloads[0]!;
      expect(overload.parameters).toEqual({});
      expect(overload.returnValue.type).toBeDefined();
    });

    it('selectors have parameters and returnValue', () => {
      const sel = findByName('selectPlayback', null);
      expect(sel!.data.description).toBeDefined();

      const overload = sel!.data.overloads[0]!;
      expect(Object.keys(overload.parameters).length).toBeGreaterThan(0);
      expect(overload.returnValue.type).toBeDefined();
    });
  });
});
