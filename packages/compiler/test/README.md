# Compiler Tests

**Test Coverage**: 30 tests passing (100%)

---

## Test Structure

```
test/
├── fixtures/
│   ├── example-minimal.tsx     # Minimal skin fixture
│   └── frosted-skin.tsx        # Full Frosted skin from React package
├── helpers/
│   └── dom.ts                  # DOM testing utilities
├── example.test.ts             # String-based integration test
├── example-dom.test.ts         # DOM-based integration test (recommended)
├── frosted-skin.test.ts        # Frosted skin integration test
└── jsx-transform.test.ts       # JSX transformation unit tests
```

---

## Testing Approaches

### 1. DOM-Based Testing (Recommended)

Uses jsdom to parse HTML and query actual DOM structure.

**Benefits**:

- Query by selectors (cleaner than string matching)
- Verify parent-child relationships
- Check attributes and classes properly
- Better error messages

**Example**:

```typescript
import { compile } from '../src';
import { parseElement, querySelector, getClasses } from './helpers/dom';

const result = compile(source);
const root = parseElement(result.html);

// Query elements
const playButton = querySelector(root, 'media-play-button');
expect(getClasses(playButton)).toContain('play-button');

// Verify structure
const track = querySelector(root, 'media-time-slider-track');
expect(track.parentElement?.tagName.toLowerCase()).toBe('media-time-slider');
```

**Files**: `example-dom.test.ts`

### 2. String-Based Testing

Uses string matching for quick checks.

**Benefits**:

- Simple and fast
- Good for smoke tests
- Useful for formatted output checks

**Example**:

```typescript
const result = compile(source);
expect(result.html).toContain('<media-play-button class="play-button">');
```

**Files**: `example.test.ts`, `frosted-skin.test.ts`, `jsx-transform.test.ts`

---

## Test Categories

### Unit Tests (`jsx-transform.test.ts`)

Tests individual transformation functions in isolation.

- Element name transformation
- Attribute transformation
- Children transformation
- Self-closing elements
- Complex examples

**21 tests** - Fast, focused unit tests

### Integration Tests (DOM-based)

Tests complete compilation pipeline with DOM parsing.

**`example-dom.test.ts`** (4 tests):

- DOM structure verification
- Element existence checks
- Parent-child relationships
- className extraction validation

### Integration Tests (String-based)

Tests complete compilation with string assertions.

**`example.test.ts`** (1 test):

- Formatted output validation

**`frosted-skin.test.ts`** (4 tests):

- Full Frosted skin compilation
- All component types
- Compound components
- Known limitations (Tooltip/Popover)

---

## DOM Testing Helpers

Located in `helpers/dom.ts`:

### `parseHTML(html: string): Document`

Parse HTML string into DOM document.

### `parseElement(html: string): Element`

Parse HTML and return first element in body.

### `querySelector(parent, selector): Element`

Query selector with better error message showing HTML context.

### `querySelectorAll(parent, selector): Element[]`

Query all matching elements.

### `hasClass(element, className): boolean`

Check if element has class.

### `getClasses(element): string[]`

Get all classes from element.

### `elementExists(parent, selector): boolean`

Check if element exists.

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test example-dom

# Run in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

---

## Writing New Tests

### Prefer DOM-Based Tests for Integration

```typescript
import { compile } from '../src';
import { parseElement, querySelector } from './helpers/dom';

it('your test name', () => {
  const result = compile(source);
  const root = parseElement(result.html);

  // Query and assert
  const button = querySelector(root, 'media-play-button');
  expect(button).toBeDefined();
});
```

### Use String Tests for Unit Tests

```typescript
import { compile } from '../src';

it('transforms element name', () => {
  const source = `export default () => <PlayButton />`;
  const result = compile(source);
  expect(result.html).toBe('<media-play-button></media-play-button>');
});
```

---

## Test Fixtures

All fixtures located in `fixtures/` directory.

### `example-minimal.tsx`

- Simple minimal skin
- Tests basic components and compound components
- Uses `@videojs/react` imports

### `frosted-skin.tsx`

- **Exact copy** from `packages/react/src/skins/frosted/FrostedSkin.tsx`
- Tests all components, icons, and patterns
- Includes Tooltip/Popover (known limitation)
- Uses real production code

---

**Test Coverage**: 30/30 passing ✅
**Environment**: jsdom
**Last Updated**: 2025-11-07
