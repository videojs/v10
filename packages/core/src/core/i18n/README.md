# Adding a built-in locale

Built-in locales live in `locales/`. The locale build generates lazy loaders, CDN chunks, and HTML/React re-exports from that directory.

1. Add `locales/<tag>.ts` using a BCP 47 filename such as `pt-BR.ts` or `zh-CN.ts`.

   ```ts
   import type { Translations } from '../params';

   export default {
     buttons: {
       play: '...',
       pause: '...',
     },
   } satisfies Partial<Translations>;
   ```

   Use `locales/en.ts` as the source of semantic keys and English defaults. Parametric strings must
   keep their placeholders.

2. Add the tag to `LOCALES` in `locales.ts`.

3. Run `pnpm -F @videojs/core run generate:locales` to validate completeness and regenerate text
   descriptors, locale loaders, CDN modules, and HTML/React re-exports.

4. Run `pnpm -F @videojs/core run generate:i18n-types` to update the typed opaque keys and
   placeholder parameters.

5. Run `pnpm -F @videojs/core test src/core/i18n` and add coverage for locale aliases or loader
   behavior when needed.

6. Run `pnpm -F @videojs/html build:cdn` to verify the generated CDN locale chunk.

Do not copy Video.js v8 locale JSON blindly. V10 uses semantic keys and different ARIA-label
semantics.
