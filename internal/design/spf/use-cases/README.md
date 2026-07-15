---
status: active
date: 2026-05-21
---

# SPF use-case compositions

A use-case record describes an engine variant assembled for a delivery scenario. Feature records answer what the engine can do; use-case records answer why a consumer needs a different composition.

## Qualification

Create a use-case record only when the candidate:

1. names a concrete delivery scenario and consumer;
2. changes composition by adding, omitting, replacing, or differently configuring behavior;
3. builds on identifiable SPF capabilities; and
4. cannot be expressed as runtime policy in the default composition.

Adapter UI and product-shell defaults stay outside SPF. A single capability belongs in features rather than here.

## Record shape

Keep each record short:

- the scenario and status;
- durable composition decisions or proposed direction;
- unresolved decisions needed before implementation;
- current source links for implemented variants;
- links to constituent feature records.

Do not preserve phase tables, speculative file inventories, or progress logs after code lands.

## Current variants

- [Audio-only mode override](./audio-only-mode-override.md): implemented subtractive HLS composition.
- [Background video](./background-video.md): implemented decorative-video composition.
- [Video-only mode override](./video-only-mode-override.md): future generic variant; requires a consumer distinct from background video.

Most delivery policy should remain a feature constraint or adapter concern. Add another composition record only when the qualification above is satisfied.
