# Language pitfalls

Read before settling wording.

- Brand names: Apple and Google keep AirPlay and Chromecast untranslated in most locales and localize only the verb. Keep the brand, localize the verb (nl `Casten`, ja キャスト, ko 전송).
- Bidi: evaluate ordering under the Unicode Bidi Algorithm and leave it alone. The he, fa, and ar packs order correctly without explicit LRM/RLM marks; do not insert them.
- Spacing: French needs U+00A0 before a colon. No other pack carries an NBSP and no test guards it, so call the character out explicitly when you add it. Stray NBSP and double spaces anywhere else are defects.
- Plurals: never hard-code a plural word inside a parametric string, because `{seconds}` can be any number. Prefer a unit abbreviation (`{seconds} s`) and let `Intl` own number and plural formatting.
- Script mixing: scan for homoglyphs and stray scripts. Source zh-TW from Traditional Chinese material rather than converting zh-CN; the sr and el packs have carried mixed-script labels.
- Length: badge and button copy must stay short. `live.badge` is a badge, not a sentence — es `Directo`, not `En directo`.
- Typography: prefer the locale's own apostrophe (`’`) over `'`.
- Consistency: a button label and its `status.*` announcement must name the feature the same way, and a label/state pair must keep the same word class (verb against verb). Internal consistency outranks literal fidelity to English.
- `common.ok` is the error-dialog dismiss button, not a generic "OK" — Close, `Cerrar`, `Fechar`.
- Aliases: `pt.ts` re-exports `pt-BR` and `zh.ts` re-exports `zh-CN`, so editing the target changes the alias too. `pt-PT` is an independent pack.
