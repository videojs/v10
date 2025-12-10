# @videojs/compiler Architecture

## Overview

The compiler transforms React skin components into HTML web component modules through a **config-driven 3-phase pipeline**. Each phase is completely generic and knows nothing about React, HTML, or Video.js—all domain knowledge lives in the configuration.

```
Source Code (string)
    ↓
[Phase 1: Analysis]
    Extract facts from AST using config-driven visitors
    ↓
AnalyzedContext { input, imports, classNames, jsx, defaultExport }
    ↓
[Phase 2: Categorization]
    Classify entities using config-driven predicates
    ↓
CategorizedContext { ..., imports[].category, classNames[].category, ... }
    ↓
[Phase 3: Projection]
    Transform using config-driven projectors + compose module
    ↓
HTML Module (string)
```

## Core Architecture Principles

### 1. Config-Driven Everything

The compiler has **zero hardcoded logic** about what to analyze, categorize, or project. All behavior is defined in `videoJSReactSkinConfig`:

```typescript
{
  phases: {
    imports: { visitor, categories },
    classNames: { visitor, categories },
    jsx: { visitor, categories },
    defaultExport: { visitor, categories }
  },
  classNameProjectors: { ... },
  projectionState: { ... },
  composeModule: (state) => string
}
```

### 2. Single Context Object

A single `context` object flows through all three phases, **accumulating data**:

- **Phase 1** adds analyzed fields (`imports`, `classNames`, etc.)
- **Phase 2** adds `category` property to each entity
- **Phase 3** adds `projectionState` with transformed output

The context is never replaced—each phase extends it.

### 3. Concerns (Not Hardcoded Fields)

The pipeline doesn't know about "imports" or "jsx"—it iterates over whatever concerns are defined in `config.phases`. Each concern gets:
- A visitor (Phase 1) that extracts entities
- Categories with predicates (Phase 2) that classify entities
- Projectors (Phase 3) that transform entities

## Phase 1: Analysis

**Question:** What exists in the source code?

**Responsibility:** Parse AST and extract usage facts without any interpretation.

### How It Works

1. Babel parses source into AST
2. For each concern in `config.phases`, run its visitor
3. Visitors use **reducer pattern**: `(prevValue, path) => newValue`
4. Accumulated values stored in context under concern key

### Example: Imports Visitor

```typescript
importsVisitor: {
  ImportDeclaration: (prevImports = [], path) => {
    const importUsage = {
      source: path.node.source.value,
      node: path,
      specifiers: { named: [...], default: '...', namespace: '...' }
    };
    return [...prevImports, importUsage];
  }
}
```

**Output:** `AnalyzedContext` with raw facts:
```typescript
{
  input: { source: "..." },
  imports: ImportUsage[],
  classNames: ClassNameUsage[],
  jsx: JSXUsage,  // tree structure
  defaultExport: DefaultExportUsage
}
```

### Key Point: No Interpretation

Phase 1 extracts **what exists**, not **what things are**. It doesn't know if an import is from React or Video.js—that's Phase 2's job.

## Phase 2: Categorization

**Question:** What ARE these things?

**Responsibility:** Classify entities using predicates, without transforming them.

### How It Works

1. For each concern in `config.phases`, get its `categories` config
2. For each entity, test predicates in order (first match wins)
3. Predicates return `true`/`false` based on entity properties
4. Add `category` property to entity
5. Handle recursive structures (e.g., JSX children)

### Category Matching Rules

- **AND logic**: All predicates in array must pass
- **First match wins**: Insertion order matters
- **Fallback**: Empty predicate array `[]` is catch-all

### Example: Import Categories

```typescript
categories: {
  style: [isImportUsedAsStyle],                              // Check first
  framework: [isImportFromFrameworkPackage],                 // Then this
  'vjs-component': [isImportUsedAsComponent, isImportFromVJSPackage],  // Both must pass
  external: []                                               // Catch-all fallback
}
```

A predicate is just a function:
```typescript
function isImportUsedAsStyle(entity: ImportUsage, context: AnalyzedContext): boolean {
  return entity.source.endsWith('.css') ||
         entity.specifiers.default?.toLowerCase().includes('style');
}
```

**Output:** `CategorizedContext` with classifications:
```typescript
{
  input: { source: "..." },
  imports: Array<ImportUsage & { category: 'style' | 'framework' | 'vjs-component' | 'external' }>,
  classNames: Array<ClassNameUsage & { category: 'literal-classes' | 'component-match' | 'generic-style' }>,
  jsx: JSXUsage & { category: '...' },  // + children recursively categorized
  defaultExport: DefaultExportUsage & { category: 'react-functional-component' }
}
```

### Key Point: Classification Only

Phase 2 adds **category labels** but doesn't transform data. The original AST nodes, source strings, etc. are preserved.

## Phase 3: Projection

**Question:** What should these things become?

**Responsibility:** Transform categorized entities to output format and compose final module.

### Two-Part Structure

Phase 3 has two distinct parts:

#### Part A: State Projectors (`projectionState`)

State-based projectors that build up `ProjectionState` object:

```typescript
projectionState: {
  styleVariableName: 'styles',              // Static value
  imports: projectImports,                  // Function: (context, prevState, config) => ProjectedImport[]
  elementClassName: projectElementClassName, // Function: (context, prevState, config) => string
  elementName: projectElementName,          // Function: (context, prevState, config) => string
  css: projectCSS,                          // Function: (context, prevState, config) => string
  html: projectHTML                         // Function: (context, prevState, config) => ProjectedHTML[]
}
```

**Projectors are accumulative**: Each projector receives `prevState` with previously computed fields. This enables dependencies (e.g., `html` projector can use `styleVariableName`).

#### Part B: Module Composition (`composeModule`)

Final template function that takes complete `ProjectionState` and generates output:

```typescript
composeModule(projection: ProjectionState): string {
  return `${formatImports(projection.imports)}

export function getTemplateHTML() {
  return /* html */\`
    \${MediaSkinElement.getTemplateHTML()}
    <style>${projection.css}</style>
    ${formatHTML(projection.html)}
  \`;
}

export class ${projection.elementClassName} extends MediaSkinElement {
  static getTemplateHTML: () => string = getTemplateHTML;
}

defineCustomElement('${projection.elementName}', ${projection.elementClassName});
`;
}
```

### Special: className Projectors

There's also `classNameProjectors` which are **element-level** projectors invoked inline during HTML generation:

```typescript
classNameProjectors: {
  'literal-classes': projectLiteralClasses,      // "foo bar" → ["foo", "bar"]
  'component-match': projectComponentMatch,      // styles.PlayIcon on <PlayIcon> → [] (omit)
  'generic-style': projectGenericStyle           // styles.Button → ["button"] (kebab-case)
}
```

These are called during the `html` projector to resolve `class` attributes for each element.

### Current Limitation: CSS Compilation

**What's implemented:** The compiler transforms JSX structure, imports, and className references. The `css` projector currently outputs a **placeholder reference** (`${styles}`) that expects pre-compiled CSS.

**What's NOT implemented:** Compilation of Tailwind utility classes to vanilla CSS. React skins use `styles.ts` with Tailwind utilities (e.g., `vjs:relative vjs:isolate vjs:@container/root`), while HTML skins need vanilla CSS (e.g., `position: relative; isolation: isolate; container: root / inline-size;`).

**Example comparison** (Frosted skin):
- **React**: `styles.MediaContainer` → `"vjs:relative vjs:isolate vjs:@container/root vjs:bg-black ..."`
- **HTML**: Needs vanilla CSS with proper selectors, media queries, pseudo-elements, etc.

This transformation involves:
- Processing Tailwind utilities through PostCSS/Tailwind compiler
- Resolving CSS variables and theme values
- Generating proper CSS with element/class selectors
- Handling advanced features (container queries, `:has()`, `@media` queries, pseudo-elements)

Pre-existing incomplete prototype implementations exist that can serve as reference points for potential approaches, but the final implementation is still being determined.

### Example: Import Projection

```typescript
const projectImports: StateProjector<ProjectedImportEntry[]> = (context, prevState, config) => {
  const imports = context.imports ?? [];

  return [
    // Base framework imports
    { type: 'import', source: '@/media/media-skin', specifiers: [{ type: 'named', name: 'MediaSkinElement' }] },
    { type: 'import', source: '@/utils/custom-element', specifiers: [{ type: 'named', name: 'defineCustomElement' }] },

    // Style imports (category: 'style')
    ...imports
      .filter(i => i.category === 'style')
      .map(i => ({ type: 'import', source: `${i.source}.css`, specifiers: [{ type: 'default', name: 'styles' }] })),

    // Component imports (category: 'vjs-component')
    ...imports
      .filter(i => i.category === 'vjs-component')
      .flatMap(i => i.specifiers.named.map(name =>
        ({ type: 'import', source: `@/define/${componentNameToElementName(name)}` })
      )),

    // Icon imports (category: 'vjs-icon') - deduplicated to single import
    ...(imports.some(i => i.category === 'vjs-icon') ? [{ type: 'import', source: '@/icons' }] : [])
  ];
};
```

**Output:** Complete HTML module as string

## Data Flow Example

Let's trace `import { PlayButton } from '@videojs/react'`:

### Phase 1: Analysis
```typescript
{
  source: '@videojs/react',
  node: NodePath<ImportDeclaration>,
  specifiers: { named: ['PlayButton'] }
}
```

### Phase 2: Categorization

Predicates checked:
1. `isImportUsedAsStyle` → `false`
2. `isImportFromFrameworkPackage` → `false`
3. `isImportUsedAsComponent` → `true` AND `isImportFromVJSPackage` → `true` ✓

Result:
```typescript
{
  source: '@videojs/react',
  node: NodePath<ImportDeclaration>,
  specifiers: { named: ['PlayButton'] },
  category: 'vjs-component'  // ← Added
}
```

### Phase 3: Projection

`projectImports` transforms it:
```typescript
{
  type: 'import',
  source: '@/define/media-play-button'
  // Side-effect import, no specifiers
}
```

`composeModule` formats it:
```typescript
"import '@/define/media-play-button';"
```

## Configuration Structure

The complete config structure (simplified):

```typescript
interface CompilerConfig {
  // Phase 1 + 2: Analysis and Categorization
  phases: {
    [concernName: string]: {
      visitor: AnalysisVisitors<T>,           // Phase 1: Extract entities
      categories: Record<string, Predicate[]>  // Phase 2: Classify entities
    }
  },

  // Phase 3: Projection
  classNameProjectors: Record<string, ClassNameProjector>,  // Element-level className resolution
  projectionState: Record<string, StateProjector | staticValue>,  // Module-level transformations
  composeModule: (projectionState) => string  // Final output generation
}
```

## Why Config-Driven?

1. **Zero Hardcoding**: Core pipeline knows nothing about React, HTML, or Video.js
2. **Easy Testing**: Test visitors, predicates, and projectors in isolation
3. **Extensibility**: Add new concerns without modifying pipeline code
4. **Clear Boundaries**: Each phase has single responsibility
5. **Discoverable**: All behavior is explicit in config

## Testing Strategy

The architecture enables comprehensive testing:

1. **Visitor Tests**: Test fact extraction in isolation
2. **Predicate Tests**: Test classification logic with fixtures
3. **Projector Tests**: Test transformations with categorized data
4. **Integration Tests**: Test complete pipeline
5. **Component Tests**: Test real-world React components

All core functions are pure (string in, string out), making them easy to test without filesystem access.

## Future Considerations

### Priority: CSS Compilation

The most critical missing piece is **Tailwind-to-vanilla-CSS compilation**. Currently, the compiler outputs a placeholder CSS reference, but production skins need actual compiled CSS.

This requires:
- Tailwind/PostCSS integration for processing utility classes
- Selector generation (element selectors, class selectors, combinators)
- Advanced CSS feature support (container queries, `:has()`, pseudo-elements)
- CSS variable resolution and theme configuration

### Other Enhancements

The config-driven architecture makes other enhancements straightforward:

- **New Frameworks**: Add Vue visitor/predicates/projectors in new config
- **New Output Formats**: Add Lit projectors, keep same analysis/categorization
- **New Features**: Add new concerns (e.g., `typeImports`, `hooks`) to phases
- **Optimizations**: Add new projectors without changing pipeline
- **CLI/File I/O**: Add boundary layer around pure pipeline

The pipeline doesn't need to change—just the configuration.
