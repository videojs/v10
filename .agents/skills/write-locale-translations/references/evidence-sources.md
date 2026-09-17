# Evidence sources

Read when choosing and citing a value. Every changed row needs one link a reviewer can open.

## Preferred corpora

Most to least applicable:

- mozilla-l10n `firefox-l10n`, `raw.githubusercontent.com/mozilla-l10n/firefox-l10n/main/<locale>/toolkit/toolkit/global/videocontrols.ftl` — Firefox's own video-control `aria-label`s, the closest match to these keys (91 citations in the 2026-09-16 pass).
- YouTube Help and Chromecast Help, `support.google.com/...?hl=<tag>` — play, pause, captions, and cast verbs (436 citations).
- `support.apple.com` localized pages — AirPlay and picture-in-picture.
- `help.netflix.com`, GNOME l10n at `gitlab.gnome.org`, `chromium.googlesource.com`, `support.microsoft.com`.
- Per-language authorities where the general corpora disagree: softcatala.org (ca), ordbokene.no (nb/nn), valodaskonsultacijas.lv (lv), academia.gal (gl), gov.wales (cy), nrk.no.

## Hygiene

- Google Help pages in many locales carry a footer noting AI-assisted translation. Use one only where a second independent source agrees, or where the page quotes a shipped player tooltip verbatim.
- Declare a failed fetch rather than working around it. An English fallback page or a bot-challenge page is not evidence.
- Cite one link per changed row. A row resting on internal consistency with the rest of the pack instead of a citable page is allowed if you say so and leave it for the native reviewer to weigh.
- Do not copy Video.js v8 locale JSON. V10 uses semantic keys and different ARIA-label semantics.
