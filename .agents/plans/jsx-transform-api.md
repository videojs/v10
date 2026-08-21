---
owner: Video.js maintainers
status: proposed
branch: t3code/ignore-compiler-artifacts
next: Prototype source-backed JSX values and structural edit lowering before choosing a public API.
---

# JSX Transform API Design

This is a temporary, non-authoritative design note. Delete it before merge unless its durable rationale is explicitly moved into an approved design record.

Build a small TSX → TSX transform API on top of Rolldown's AST and MagicString.

## Goals

- Make transforms read like the desired output.
- Keep AST traversal, source ranges, edit ordering, imports, and MagicString internal.
- Preserve original source wherever possible instead of reprinting AST.
- Optimize for structural JSX transforms first.
- Keep expression/AST generation as a small escape hatch.
- Make platform registries mostly describe exceptions, not exhaustive mappings.

## Core model

```text
Rolldown AST
  ↓
find canonical JSX
  ↓
source-backed transform context
  ↓
return JSX / expression IR
  ↓
structural edit IR
  ↓
MagicString
```

Treat the AST as read-only.

Use MagicString only as the final lowering mechanism.

## Primary API

```tsx
defineJSXTransform({
  components: {
    Container: $.MediaContainer,

    Controls: {
      Root: $.Controls,
      Group: $.ControlsGroup,
    },

    Poster: ({ props, children }) => (
      <$.Poster render={children} {...props} />
    ),

    Popover: ({ props, parts }) => (
      <>
        {parts.Trigger.children}

        <$.Popover {...props} {...parts.Popup.props}>
          {parts.Popup.children}
        </$.Popover>
      </>
    ),
  },
});
```

Support three entry forms:

```ts
Foo: $.Target

Foo: {
  Root: $.Target,
  Part: $.OtherTarget,
}

Foo: ctx => <Target />
```

Use simple mappings whenever possible and JSX functions only for structural exceptions.

## Transform context

Keep the context small:

```ts
interface JSXTransformContext {
  props: Props;
  children: Children;
  parts: Parts;
  parent: JSXNode | null;

  id(name: string): Expression;
}
```

Expose common values directly:

```tsx
Foo: ({ props, children, parts, id }) => (
  ...
)
```

Avoid nested APIs such as `render({ props, reference, ... })`.

## Output references

Use `$` as a compile-time output namespace:

```tsx
<$.Popover />
<$.Slider.Thumbnail />
```

The compiler resolves the target and automatically handles imports or platform-specific element names.

No explicit:

```ts
const Popover = reference($.Popover);
```

For React, `$` may emit an import.

For HTML, `$` may emit a custom element.

## Source-backed values

`props`, `children`, and part values should represent original source ranges, not reconstructed AST.

This:

```tsx
<$.Poster {...props}>
  {children}
</$.Poster>
```

should preserve the original expressions and child source.

Likewise:

```tsx
<Player poster={props.src} />
```

should move the original `src` expression into the new prop without printing it again.

Useful APIs:

```ts
props.has('src');
props.get('src');
props.omit('children');

children;
parts.Popup.props;
parts.Popup.children;
```

## Structural transforms

Prefer declarative replacement over path mutation.

Instead of:

```ts
path.setProp(...);
child.remove();
path.insertAfter(...);
```

write:

```tsx
Popover: ({ props, parts }) => (
  <>
    {parts.Trigger.children}

    <$.Popover {...props} {...parts.Popup.props}>
      {parts.Popup.children}
    </$.Popover>
  </>
)
```

The returned JSX describes the desired output tree.

## Generated functions

JSX alone cannot represent code that should become an emitted callback.

Provide one explicit helper:

```tsx
fn('props', props => (
  <div {...props}>
    {children}
  </div>
))
```

Example:

```tsx
chapter: ({ children }) => (
  <Host
    renderChapter={fn('props', props => (
      <div {...props}>
        {children}
      </div>
    ))}
  />
)
```

`fn()` builds output syntax. It does not represent a compiler-time JavaScript callback.

## Expression IR

Keep expression generation minimal and separate from JSX transforms.

Provide a few primitives:

```ts
fn();
call();
identifier();
literal();
```

Example:

```ts
className({ value }) {
  return call($.cn, ...value.items);
}
```

More complex:

```ts
return fn('state', state =>
  call(
    $.cn,
    ...value.withoutIdentifier('className'),
    call($.resolveClassName, value.identifier('className'), state),
  )
);
```

Do not expose TypeScript `Factory` in normal registry code.

## Primitives

Treat primitives exactly like components:

```tsx
primitives: {
  Group: 'div',

  Slot: ({ children }) => children,

  Text: ({ props, children }) =>
    props.token
      ? <$.Text {...props}>{children}</$.Text>
      : <span {...props}>{children}</span>,
}
```

Variants/templates can use the same model:

```tsx
templates: {
  qualityOption: {
    Root: ({ children }) => <template>{children}</template>,

    Label: ({ props }) => (
      <span data-part="label" {...props} />
    ),

    Tier: ({ props }) => (
      <sup data-part="tier" {...props} />
    ),
  },
}
```

Avoid inventing a separate transform system for templates.

## Defaults over exhaustive registries

Generated 1:1 mappings should be automatic.

Registries should contain only:

- renamed targets
- compound-part mappings
- structural rewrites
- platform-specific prop behavior
- unusual primitives/templates

The HTML and React registries should primarily be lists of exceptions.

## Internal edit model

Do not mutate MagicString immediately.

Lower transform output into a structural edit IR first:

```ts
ReplaceNode(...);
MoveSource(...);
MoveProps(...);
InsertGenerated(...);
RemoveNode(...);
```

Then:

```text
JSX result
  ↓
Edit[]
  ↓
validate overlaps/conflicts
  ↓
MagicString
```

This lets transform authors ignore source offsets and edit ordering.

## Escape hatch

Keep raw compiler access available, but clearly secondary:

```ts
transformAST({ node, ast, magicString }) {
  // uncommon low-level transform
}
```

Most platform registries should never need it.

## Recommended public surface

Keep the API approximately this small:

```ts
defineJSXTransform();

$;

Fragment;
Host;

fn();
call();

props;
children;
parts;
id();
```

The central design principle is:

```text
AST = understand source
JSX = describe desired output
source fragments = preserve existing code
expression IR = generate new language constructs
MagicString = apply final edits
```

Do not build a general mutable AST API unless a transform truly requires it.
