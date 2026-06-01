# Appendix A — working draft

Scratch doc for the "why a filter + sort pipeline isn't enough" appendix of
[`track-switching-architecture.md`](../../internal/design/spf/track-switching-architecture.md).
We iterate here and fold back in as Appendix A once settled; the live design doc keeps its
current (in-progress) Appendix A untouched in the meantime.

## Shared example

Both options run on **one** track set and **one** rule set:

- **Option 1** — `filter` means *forbidden-or-not-preferred* (the two conflate).
- **Option 2** — `filter` means *forbidden*; the *preferred*-vs-*allowed* distinction is pushed onto sort order.

The only thing that varies between the two is one environmental assumption — **whether the browser
can decode E-AC-3** — which changes what `capabilityProbing` forbids. Tracks and the rule definitions
are otherwise identical.

### Tracks

Audio renditions for one source. Spanish is the user's preferred language and ships as E-AC-3
(surround, runs hotter than AAC); English ships as AAC.

```ts
const tracks = [
  // Spanish — E-AC-3
  { id: 'esLowEac',  lang: 'es', codec: 'eac3', bitrate: 192 },
  { id: 'esHighEac', lang: 'es', codec: 'eac3', bitrate: 384 },
  { id: 'esMaxEac',  lang: 'es', codec: 'eac3', bitrate: 640 },
  // English — AAC
  { id: 'enLowAac',  lang: 'en', codec: 'aac',  bitrate: 64  },
  { id: 'enHighAac', lang: 'en', codec: 'aac',  bitrate: 256 },
  { id: 'enMaxAac',  lang: 'en', codec: 'aac',  bitrate: 512 },
];
```

### Rules

Three rules, in priority order (rule 1 highest). Each is a general track-selection *concern* — what
it's trying to achieve, not how it's expressed. The options below take these same concerns and
combine them in different ways; only the concerns are shared.

| # | Rule | Category | The concern |
|---|------|----------|-------------|
| 1 | `preferredLanguage` | user-intent | The user picked a language: want every track in it; no opinion on bitrate; tracks in other languages are acceptable but not wanted. |
| 2 | `capabilityProbing` | system | Some tracks are unplayable (undecodable codec, unsupported DRM, …) and must be excluded; no preference among the playable rest. |
| 3 | `abr` | system | Throughput-based quality: of the tracks that fit the current throughput estimate, want the highest quality; over-throughput tracks are usable only as a fallback, least-over first. |

### Applying the rules

A concrete pick depends on the playback **context** — three facts, one per rule:

- **Preferred language** — Spanish.
- **E-AC-3 decodable?** — yes or no (the one fact we change to discuss the differences).
- **Throughput estimate** — ~300 kbps, so `esLowEac`, `enLowAac`, `enHighAac` fit and `esHighEac`, `esMaxEac`, `enMaxAac` are over.

Given that context, each rule wants:

- **`preferredLanguage`** wants the Spanish renditions `esLowEac`, `esHighEac`, `esMaxEac` (no order among them); English is acceptable but not wanted.
- **`capabilityProbing`** excludes the three Spanish renditions if E-AC-3 isn't decodable, otherwise excludes nothing; either way it has no preference/order among whatever remains playable.
- **`abr`** wants the fitting renditions best-quality first — `enHighAac`, `esLowEac`, `enLowAac` — and treats the over-throughput ones as a last-resort fallback, least-over first — `esHighEac`, `enMaxAac`, `esMaxEac`.

<!-- NEXT: pin the model semantics, then build Option 1 and Option 2 worked examples on this shared base. -->
