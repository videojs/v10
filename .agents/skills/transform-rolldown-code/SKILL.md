---
name: transform-rolldown-code
description: Transform code. Use for Rolldown.
---

# Rolldown code transforms

Use the incoming Oxc AST for analysis and its paired MagicString for source edits.

## Workflow

1. Narrow modules with a native transform hook filter. Use a cheap `code.includes(...)` guard before accessing `meta.ast` so parsing stays lazy.
2. Access `meta.ast` only when syntax analysis is required. It is a read-only Oxc `Program` parsed according to `meta.moduleType` and supports JavaScript, JSX, TypeScript, and TSX syntax.
3. Use AST `start` and `end` offsets with `meta.magicString.overwrite`, `remove`, `appendLeft`, or related edits. Both values describe the same incoming `code` string.
4. Return the edited MagicString as `{ code: magicString }`. Edits are ignored when the hook does not return it. Return `null` when nothing changed.
5. Keep using offsets from the original hook input. The AST does not update after MagicString edits. Analyze generated syntax in a later transform pass or plugin when necessary.
6. Keep module-oriented edits in `transform`. Use `renderChunk` only when the replacement depends on final generated code, chunk filenames, output format, or the rendered chunk graph; never move ordinary AST transforms there.

Treat `meta.ast` as read-only. Mutating its nodes does not change output because Rolldown does not print the modified JavaScript AST.

The Oxc AST is syntactic. It includes TS and TSX nodes but has no TypeScript `Program`, `TypeChecker`, resolved symbols, inferred types, or cross-file semantics.

For true AST-to-AST transforms, use an appropriate parser, transformer, and code generator, then return generated code with a source map. Every source-changing transform should provide a map unless it intentionally documents a `sourceMap: false` option; returning native MagicString provides one automatically. Use `map: null` only when the edit does not move code.

Treat `meta.ast` and `meta.magicString` as a required contract in repository-owned Rolldown builds and fail clearly when either is unexpectedly unavailable. Only synthesize or guard the metadata in an intentional compatibility adapter, such as the Vite adapter.

## Host setup

Explicitly enable Rolldown's native implementation in every repository-owned input config that runs these transforms:

```ts
experimental: {
  nativeMagicString: true,
}
```

For tsdown, put the same option under `inputOptions.experimental`. Keep returning the native object directly so Rolldown can generate and compose source maps off the main thread. Enable output `sourcemap: true` when the build should emit map files. See the [native MagicString guide](https://rolldown.rs/in-depth/native-magic-string) and [source transformation guide](https://rolldown.rs/apis/plugin-api/transformations).

Vite does not forward Rolldown's `ast` or `magicString` transform metadata in the pinned version, even when its build enables native MagicString. Continue to adapt these transforms through `packages/vjsc/src/vite/oxc.ts` for Vite serve and build.

## Pattern

```ts
import { walk } from 'oxc-walker';

export const plugin = {
  name: 'example-transform',

  transform(code, id, meta) {
    if (!code.includes('$compile')) return null;

    const ast = meta.ast;
    const magicString = meta.magicString;
    if (!ast || !magicString) {
      throw new Error('example-transform requires Rolldown AST metadata and native MagicString.');
    }

    let changed = false;

    walk(ast, {
      enter(node) {
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === '$compile'
        ) {
          magicString.overwrite(node.callee.start, node.callee.end, 'compile');
          changed = true;
        }
      },
    });

    return changed ? { code: magicString } : null;
  },
};
```

Think of the hook as:

```text
incoming code
  -> Oxc AST: find and understand syntax
  -> MagicString: edit source using AST ranges
  -> return edited code
```

## Validation

Run the transform through a real Rolldown build with native MagicString explicitly enabled. Assert changed and unchanged modules, relevant JS/JSX/TS/TSX forms, source maps when consumers need them, and a clear failure when required metadata is unavailable.

## Example

Input: "Rename `$compile()` calls without changing matching strings or comments."

Output: A filtered transform that finds call expressions through `meta.ast`, overwrites the callee ranges through `meta.magicString`, returns the edited value, and passes a real Rolldown build test.
