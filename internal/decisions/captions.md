---
status: decided
date: 2026-02-26
---

# Captions: Native Rendering by Default

## Decision

Use native browser caption rendering by default. Custom caption rendering (HTML overlay) may be offered as opt-in in the future but is not the default path.

Leverage WebKit pseudo-selectors and JS-based cue repositioning (from Mux Player prior art) to position native captions around player controls.

## Context

Sam built custom caption rendering with `::cue` styling, `prefers-contrast: more` support, `prefers-reduced-motion` adaptation, and control-aware positioning. The question was whether Video.js 10 should use custom rendering or native captions.

New FCC regulations ([closed captioning display settings rule](https://www.fcc.gov/consumer-governmental-affairs/commission-announces-effective-date-closed-captioning-display-settings-rule)) require legally covered entities to respect OS-level user preferences for caption styling. There are no Web APIs to read those OS preferences yet (privacy/security concerns are blocking standardization — see [WebKit explainer](https://github.com/WebKit/explainers/tree/main/CaptionDisplaySettings)). Custom rendering would bypass these OS preferences, creating legal compliance issues.

## Alternatives Considered

- **Custom HTML overlay rendering (default)** — Better styling control and cross-browser consistency, but bypasses OS-level caption preferences required by FCC regulations. Not viable as the default for users who must comply with accessibility law.
- **Custom rendering as opt-in** — Possible future addition. Heff and Christian didn't rule it out but it would need careful documentation about compliance trade-offs. Not in scope for initial release.

## Rationale

- Legal compliance: entities bound by FCC rules must respect OS caption preferences, which only native rendering honors.
- Weight: avoids the complexity of a full caption rendering pipeline.
- Prior art: Mux Player already solved native cue repositioning via JS ([cue positioning code](https://github.com/muxinc/elements/blob/main/packages/mux-player/src/themes/gerwig/gerwig.html#L67-L90)) and WebKit pseudo-selectors ([custom-media-element sizing](https://github.com/muxinc/media-elements/blob/main/packages/custom-media-element/custom-media-element.ts#L94-L113)).
- Styling is limited but acceptable: `video::cue` works in Chrome/Firefox, WebKit needs vendor pseudo-selectors, iOS Safari may override with system UI in fullscreen.

## Positioning Approach

Native cue positioning uses two techniques:

1. **WebKit** — CSS via vendor pseudo-selectors (`::-webkit-media-text-track-display`) with CSS custom properties.
2. **Cross-browser** — JS-based cue line position manipulation at runtime (Mux Player approach).

A scale transform prevents captions from touching container edges.

## Open Questions

- Christian wants to be involved in any future custom rendering design — it straddles architectural layers with many gotchas.
- Christian has been pushing for a "Render Region" Web API at FOMS for rendering captions outside the video region.
- `removeTextTrack()` may be re-added to the spec.

## Participants

Sam, Rahim, Christian Pillsbury, Wesley Luyten, Heff
