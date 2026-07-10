# Adding a built-in locale

Built-in locales live in `locales/`. The locale build generates lazy loaders, CDN chunks, and HTML/React re-exports from that directory.

1. Add `locales/<tag>.ts` using a BCP 47 filename such as `pt-BR.ts` or `zh-CN.ts`.

   ```ts
   import type { Translations } from '../types';

   export default {
     Play: '...',
     Pause: '...',
   } satisfies Partial<Translations>;
   ```

   Use `locales/en.ts` as the source of phrases. Parametric strings must keep their placeholders.

2. Add the tag to `LOCALES` in `locales.ts`.

3. Run `pnpm -F @videojs/core build` to regenerate locale loaders and HTML/React re-exports. Do not edit generated files.

4. Run `pnpm -F @videojs/core test src/core/i18n` and add coverage for locale aliases or loader behavior when needed.

5. Run `pnpm -F @videojs/html build:cdn` to verify the generated CDN locale chunk.

Do not copy Video.js v8 locale JSON blindly. V10 uses different phrase keys and ARIA-label semantics.
