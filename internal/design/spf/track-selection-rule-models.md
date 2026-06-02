---
status: draft
date: 2026-06-02
---

# Track selection rule models: Filter + Sort vs Preference Tiers

## The problem

Track selection started simple — one behavior writing each state signal, one default-picker per track
type. As features accumulate, many independent decision domains converge on the same selection signal
(`selectedVideoTrackId` / `selectedAudioTrackId`):

- Bandwidth-driven ABR
- Consumer-driven preference (an explicit user selection)
- Capability physics (a codec/DRM the environment can't decode)
- Codec policy (prefer/force AVC, surround vs stereo)
- Delivery policy (resolution caps, multi-signal ABR)
- CDN routing (failover, content steering)
- Default-language picking

Each new feature would otherwise need either another behavior competing to write the signal or a new
branch in a central picker — both lead to a monolith that grows a branch per feature. The shared substrate that
avoids this is a **pipeline**: a candidate track list flows through feature-contributed *rules* into a
composer that produces the ordered list whose first entry becomes the selection.

```
candidate tracks → [rule] → [rule] → … → composer → picked track id
```

This document takes that pipeline shape as a working assumption — not the only conceivable substrate,
but the one assumed throughout here, and a well-grounded one: every major adaptive-streaming engine
separates a hard pruning pass from soft ranking (surveyed in [Appendix A](#appendix-a-prior-art)). The
open question — and the subject of this doc — is the **rule model**: both the shape of an individual
*rule* and how rules **compose** into a final pick. The two are a package — a rule shape implies a way
of combining rules, and the composition strategy is where the models differ most. Two are on the table:

- **Filter + Sort** — a rule either removes tracks that can't play (a filter) or reorders the rest by
  some preference (a sort). The composer drops the filtered-out tracks, then applies the sorts in
  priority order; the last sort applied decides the winner.
- **Preference Tiers** — a rule emits a per-track verdict (`preferred` / `allowed` / `forbidden`); the
  composer combines those verdicts across rules by category — roughly, forbidden out, preferred ahead of
  allowed, ordered within a tier. (Exactly how the categories combine is itself part of what this model
  has to settle.)

The headline: **on every rule we currently have, the two produce the same picks.** This is not a
correctness contest. The choice is about how rules get authored, how robust composition is to an
author's mistake (and how bad the mistake is), what a *new* rule costs, and one capability one model
has that the other doesn't.

## The rule set we're designing for

To compare the models on more than the toy example, we need a realistic spread of selection concerns.
The table below is that working set — the concerns we *anticipate* features contributing, drawn from
feature planning across the project.

**Treat it as illustrative, not a specification.** Most of these aren't implemented yet; several aren't
precisely defined; and some will likely become more than one rule once they are — `rendition-selection-caps`,
for one, is really an upper cap, a hard floor, and a soft floor, which behave differently (see §5). The
"kind" assigned to each is a best-current-guess, not a settled classification. The point isn't the exact
roster — it's that the set is *varied and growing*, which is what stresses the two models differently.

With that caveat, each concern is sketched as one of three kinds — a **filter** (excludes unplayable
tracks), a **scope** (a preference we'd rebuffer to honor), or a **ranker** (orders by a runtime signal):

| Feature (anticipated) | Likely kind | Roughly what it wants |
|---|---|---|
| `capability-probing` | filter | Exclude tracks the environment can't decode (codec/DRM). |
| `multi-cdn-failover` | filter + scope | Exclude a failed CDN's tracks during cooldown; prefer the active CDN's tracks. |
| `content-steering` | scope | Prefer the active pathway's tracks. |
| `video-abr` / `audio-abr` | ranker | Of the fitting tracks, highest quality; over-throughput as fallback. |
| `multi-signal-abr` | ranker | Order by a fused quality/throughput signal. |
| `userVideoTrackSelection` / `userAudioTrackSelection` | scope | Honor an explicit user pick above all policy. |
| `multi-language-audio` | scope | Prefer the default/selected language. |
| `5.1-surround-selection` | scope | Prefer the requested channel layout. |
| `hevc-variant-selection` | scope | Prefer (or force) a codec, e.g. AVC over HEVC. |
| `rendition-selection-caps` | scope (likely several) | Stay within an upper cap (player/screen size, cost tier) and/or above a floor. |

This set is already long, and it will grow as features land. That breadth — not any single entry — is
the backdrop for the comparison.

## A shared example

A compact subset of those concerns, on one track set, used to watch both models work.

```ts
const tracks = [
  // Spanish — E-AC-3 (surround, runs hotter than AAC)
  { id: 'esLowEac',  lang: 'es', codec: 'eac3', bitrate: 192 },
  { id: 'esHighEac', lang: 'es', codec: 'eac3', bitrate: 384 },
  { id: 'esMaxEac',  lang: 'es', codec: 'eac3', bitrate: 640 },
  // English — AAC
  { id: 'enLowAac',  lang: 'en', codec: 'aac',  bitrate: 64  },
  { id: 'enHighAac', lang: 'en', codec: 'aac',  bitrate: 256 },
  { id: 'enMaxAac',  lang: 'en', codec: 'aac',  bitrate: 512 },
];
```

| # | Rule | Kind | The concern |
|---|------|------|-------------|
| 1 | `preferredLanguage` (a `multi-language-audio` / user pick) | scope | Want every track in the chosen language; no opinion on bitrate; other languages acceptable but not wanted. |
| 2 | `capabilityProbing` | filter | Exclude unplayable tracks; no preference among the playable rest. |
| 3 | `abr` | ranker | Of the fitting tracks, highest quality; over-throughput tracks a fallback, least-over first. |

A pick depends on the playback **context** — one fact per rule:

- **Preferred language** — Spanish.
- **E-AC-3 decodable?** — yes.
- **Throughput estimate** — ~300 kbps, so `esLowEac` / `enLowAac` / `enHighAac` fit; the rest are over.

The correct pick is **`esLowEac`** — the user wants Spanish, and `esLowEac` is the only Spanish
rendition that fits. Note the trap: the best *fitting* track overall is `enHighAac` (256 > 192), so any
model that lets throughput quietly outrank language picks English here — wrong.

## How each model works

### Filter + Sort

Two kinds of rule, two authoring questions.

- A **hard filter** removes tracks permanently. *May a rule be a hard filter?* Only if its exclusion
  means "can't play in this environment" — un-playable, not un-preferred-by-policy. Litmus: *if this
  exclusion emptied the set, is failing the right outcome?* Only `capability-probing` and a failed CDN
  during cooldown pass. Policy exclusions (caps, forced codec, user de-selection) exclude *playable*
  tracks — they are sorts that rank the disfavored last and always fall back.
- Every other rule is a **stable sort** — it reorders by its own criterion but leaves the existing order
  untouched among tracks it can't tell apart. *Where does it go in the chain?* Litmus: *would we rebuffer
  to honor it?* Yes → it sorts after `abr` (it outranks throughput). No → before `abr` (it only breaks
  ties among already-fitting tracks).

The composer drops every forbidden track first (pooling all the filters' exclusions), then applies the
sorts one after another. Because each sort is stable, applying them in sequence layers them: the rule
applied *last* decides the winner, and each earlier rule only breaks the ties the later rules leave open.
The pick is the first track in the final list.

On the shared example — `capabilityProbing` forbids nothing (E-AC-3 decodes); `abr` sorts first
(weakest), `preferredLanguage` last (it rebuffers to honor, so it wins):

```ts
let results = applyFilters(tracks);    // → all six (nothing forbidden)
results = abr(results);                // → [enHighAac, esLowEac, enLowAac, esHighEac, enMaxAac, esMaxEac]   quality order
results = preferredLanguage(results);  // → [esLowEac, esHighEac, esMaxEac, enHighAac, enLowAac, enMaxAac]   Spanish floated to front, stably

pick = results[0] = esLowEac           // ✅  language primary, abr's order preserved as the within-language tiebreak
```

`preferredLanguage` reorders only by language (stable), so it floats Spanish forward *without*
disturbing `abr`'s order inside each language. Get the order wrong — `abr` last — and it overrides the
language scope and picks `enHighAac`. The order is load-bearing.

### Preference Tiers

A rule emits a per-track verdict. `preferred` and `forbidden` are explicit; `allowed` is everything a
rule leaves over — the tracks it neither prefers nor forbids, in no particular order. A rule names its
`allowed` tracks explicitly only when it *ranks* that leftover, as `abr` does for its over-throughput
tracks.

The composer:

1. **Tier** — a track is forbidden if *any* rule forbids it. Of the rest, a track is preferred only if
   *every* rule that has a preference prefers it (the cautious reading); anything that's neither forbidden
   nor preferred-by-all is allowed.
2. **Order** — within a tier, the order comes from the rules that ranked those tracks; the allowed
   leftover is otherwise unordered.
3. The pick is the first `preferred` track, falling through to `allowed`.

On the shared example:

```ts
preferredLanguage  // { preferred: [esLowEac, esHighEac, esMaxEac] }                        English implicitly allowed
capabilityProbing  // { }                                                                   forbids nothing; no effect on the tiers
abr                // { preferred: [enHighAac, esLowEac, enLowAac], preferredRanked: true,
                   //   allowed: [esHighEac, enMaxAac, esMaxEac] }                           over-throughput tier, ranked

// composite tier (a track is preferred only if every rule with an opinion prefers it):
//   esLowEac            → preferred   (preferredLanguage ✓ and abr ✓)
//   enHighAac, enLowAac → allowed     (abr prefers, but preferredLanguage only allows English)
//   esHighEac, esMaxEac → allowed     (preferredLanguage prefers, but abr only allows over-throughput)
pick = first preferred = esLowEac      // ✅  beats enHighAac by TIER, even though abr ranks enHighAac higher by ORDER
```

`preferredLanguage`'s silence on English is what demotes `enHighAac`: composite-`preferred` requires
unanimous preference. The tier carries the language scope; the order carries `abr`'s ranking. No rule
ordering was needed to get here.

## Both models cover the anticipated rule set

The shared example is small. The claim that the two models are *correctness-equivalent* has to hold
against the broader set above, not just the toy case. It does — here is each model's arrangement of those
concerns (with the same illustrative-not-final caveat as the table).

### Filter + Sort: the two chains

Each chain runs in application order (first = weakest tiebreak, last = winner). Tiers: **quality base**,
then **policy** (beats ABR), then **explicit user selection** (the winner).

```
AUDIO → selectedAudioTrackId

FILTERS:  capability-probing (codec/DRM) · multi-cdn-failover (failed CDN)
SORT (weakest → winner):
  quality   audio-abr                 fitting > over-throughput
  policy    5.1-surround              requested channel layout (rebuffer to honor)
  policy    content-steering          active pathway          (reflects upstream pick)   [shared]
  policy    multi-cdn-failover        active CDN               (reflects upstream pick)   [shared]
  policy    multi-language-audio      default language
  user      userAudioTrackSelection   chosen language          ← winner
```

```
VIDEO → selectedVideoTrackId

FILTERS:  capability-probing (codec/DRM) · multi-cdn-failover (failed CDN) · (future) dropped-frames
SORT (weakest → winner):
  quality   video-abr / multi-signal-abr / (future) dropped-frames
  policy    hevc / force-AVC          preferred codec (rebuffer to honor)
  policy    rendition cap (upper)     within-cap first (runs with abr's ceiling — never rebuffers)
  policy    rendition floor (hard)    ≥floor first     (rebuffer rather than show too-low)
  policy    content-steering          active pathway   (reflects upstream pick)   [shared]
  policy    multi-cdn-failover        active CDN        (reflects upstream pick)   [shared]
  user      userVideoTrackSelection   chosen rendition ← winner
  ── not placeable ──
  ✗ rendition floor (soft)            "prefer ≥Y but don't rebuffer" → a tier straddle (see §5)
```

Two notes the chains depend on:

- **Pathway rules reflect an upstream pick.** A separate, session-level behavior owns *which* CDN/pathway
  is active (it identifies pathways, picks one, fails over). `content-steering` / `multi-cdn-failover`
  don't choose — they *reflect* that state: prefer the active pathway (scope) and forbid a failed one
  (filter). Throughput shifts from a switch are read by `abr` downstream; the two never form a loop.
- **Cross-chain consistency is a composition convention.** The audio and video rule sets include the
  *same* pathway rule definition, so both reflect the same upstream pick and stay on one pathway.
  Mis-wiring a different pathway rule per type is the only failure mode — a convention tolerates it.

### Preference Tiers: the same rules as verdicts

The identical rule set maps one-to-one onto verdicts: each filter emits `forbidden`, each scope emits
`preferred`, each ranker emits `preferred` + `preferredRanked` (+ `allowed` for its fallback tier). The
composer forbids any track some rule forbids, keeps as preferred only the tracks every preferring rule
agrees on, and orders within each tier by the ranking rules — reaching the same pick as the chain on
every case above. No chain order is authored.

The one row that *doesn't* carry over is the `✗` line — `rendition floor (soft)`. Filter + Sort can't
place it; Preference Tiers can. That is the subject of §5.

## Where they diverge (and how costly the mistakes are)

Both reach the same picks across the rule set. They differ in *what an author can get wrong* and *what a
new rule costs*.

### 1. How much rides on rule order

In **Filter + Sort**, every rule pair is order-critical: the cap must follow `abr` or it is silently
ignored; `language` must follow `abr` or it is overridden. The order itself *is* the behavior.

In **Preference Tiers**, the tier is built by agreement, not by order: a track is preferred when every
preferring rule agrees on it, forbidden when any rule forbids it — and those checks give the same answer
whatever order the rules run in. A preference that doesn't rank anything can't change the order within a
tier either. So with one ranker (`abr`) plus preferences that only narrow (caps, pathway, language),
**order is irrelevant** — including the `language`-vs-`abr` pair that was order-critical above. Order
matters only when *two or more rankers* disagree (`abr` vs `multi-signal-abr`).

*Mistake severity:* a Filter + Sort mis-order silently produces the wrong pick. The same logical rules in
Preference Tiers usually can't be mis-ordered at all.

### 2. Can a mistake cause an unwanted rebuffer?

The hard-filter (`forbidden`) side is equally robust in both — the exclusions are pooled up front, so
order doesn't matter.

But Filter + Sort folds `abr`'s fitting/over **tier** and its bitrate **ranking** into a single sort. A
mis-order *there* isn't merely suboptimal — it can be **unsafe**, putting an over-throughput track first
and forcing a rebuffer. Preference Tiers keeps the tier (the cautious fitting/over decision) separate
from the order, so "never rebuffer" doesn't depend on getting the order right; a mis-order is at worst a
suboptimal pick within the fitting set.

### 3. What a new rule costs

Adding a tier-shaping rule is where the models part hardest. Take a min-resolution floor — "prefer ≥360p,
but don't rebuffer for it" (ladder 240/360/480, desired picks across throughput = `360, 360, 240`).

- **Filter + Sort:** no single position for the floor works — *after* `abr` it rebuffers when only 240p
  fits; *before* `abr` it can't lift 240p→360p when 360p fits. The fix is to **rewrite `abr`**: split it
  into `abr-rank` (bitrate order, needs no runtime data) and `abr-tier` (the fits-vs-over split from
  throughput), then slot the floor between them by hand. An existing rule has to be re-opened.
- **Preference Tiers:** leave `abr` untouched and *add* `floor { preferred: [≥360p] }`. The tracks both
  rules prefer (fitting *and* ≥360p) become preferred, with `abr` ordering the fall-through → `360, 360,
  240`. No existing rule changes.

The split that Filter + Sort needs *is* what the Preference Tiers composer already does — work out a
tier, then order within it. So the Preference Tiers machinery is the pay-once, up-front form of the
rewrites Filter + Sort takes one at a time.

### 4. Skipping the expensive estimate (early-bail)

Preference Tiers works by narrowing the candidate set, so "apply the cheap preferences first; if only one
track is left in scope, that's the pick — never run the expensive `abr` throughput estimate" is the
obvious move. The Filter + Sort chain applies `abr` (the weakest sort) *first*, across the whole list, so
there is nothing to stop early; it can recover the shortcut only by flipping the chain around into "rank
each track and take the best," working out a track's criteria only as needed — and even that breaks down
once a tier-straddle (below) makes the throughput tier a top criterion, which "take the best" then has to
work out up front anyway.

### 5. The one capability gap: tier straddles

There is exactly one thing Preference Tiers expresses that Filter + Sort can't (without the §3 rewrite): a
preference that must **reorder within the fitting set, against the baseline ranking**, yet **must not
rebuffer**. It needs to sit *between* `abr`'s tier and its ranking — and a single fused sort key can't be
straddled. The min-resolution floor in §3 is the clearest example (it appears as the `✗` row in the video
chain), and it is an *ordinary* product ask ("don't drop below 360p, but don't rebuffer for it"), not a
corner case. Preference Tiers handles it natively because its tier and order are already separate.

Note what is *not* a straddle and lands cleanly in both models: a **scope** that rebuffers to honor it
(preferred language, channel layout, a *hard* resolution floor) just sorts after `abr`; an **upper cap**
runs *with* `abr`'s ceiling and never forces a rebuffer; preferring the *lower*-bandwidth option never
rebuffers. The straddle appears only when a rule must fight the baseline's ranking *and* respect the tier
at once.

## Summary

| Axis | Filter + Sort | Preference Tiers |
|------|---------------|------------------|
| Primitives | Two (hard filter, stable sort) — simple | One verdict shape + a composer — more machinery |
| Picks (current rules) | Correct | Correct (identical) |
| Rule order | Load-bearing for every pair | Matters only when 2+ rankers disagree |
| Mis-order severity | Wrong pick, sometimes an unsafe rebuffer | At worst a suboptimal in-tier pick; never unsafe |
| New tier-shaping rule | Rewrite/split an existing rule | Add a rule; nothing else changes |
| Early-bail | Not natural in the chain | Natural (narrows the candidate set) |
| Tier straddle (soft floor) | Not expressible without the split | Native |
| Pathway / cross-chain consistency | Composition convention (same handling) | Composition convention (same handling) |

## Where this points

The two models are correctness-equivalent on today's rule set. Every axis on which they differ favors
Preference Tiers — order-robustness, safety under author error, rewrite-free extensibility, natural
early-bail, and the tier straddle — *except* primitive simplicity, where Filter + Sort wins.

So the decision reduces to one judgment about the future of the rule set:

- **If the rule set stays small and stable, and soft tier-straddles are ruled out of scope,** Filter +
  Sort's two simple primitives are enough and cheaper to reason about.
- **If the rule set grows** (the anticipated set above is already long) **or a soft resolution floor is in
  scope,** Preference Tiers pays its extra structure back as composition that doesn't break under
  reordering and doesn't require reopening shipped rules.

Given that rule set and that the min-resolution floor is an ordinary ask, the analysis leans Preference
Tiers. Status stays `draft` pending that call.

## Appendix A: prior art

Every major HTTP-adaptive-streaming engine separates **hard constraints (a pruning pass) from soft
ranking**, and none combines decision sources by weighted-sum scoring. That universal hard/soft split is
what grounds the [pipeline assumption](#the-problem) — prune-then-rank is the shape the whole field
converged on. Where engines differ is the soft-combination *policy*, and those policies map directly onto
the two rule models this doc compares.

| Engine | Hard exclusion | Soft combination policy | Criteria are… |
|---|---|---|---|
| [**Shaka**](https://github.com/shaka-project/shaka-player) | `getPlayableVariants()` gate (`filterManifest` + `applyRestrictions`); two typed errors | preference narrows the set, then a *single* bandwidth ranker (`SimpleAbrManager`) | a fixed pipeline |
| [**hls.js**](https://github.com/video-dev/hls.js) | codec-unsupported levels removed from the manifest | one ABR ranker + min/max **index clamping** (cap-level, HDCP, min-bitrate each write a clamp) | hardcoded controllers |
| [**VHS**](https://github.com/videojs/http-streaming) | `excludeUntil === Infinity` (`isIncompatible` / `isEnabled`) | bandwidth + resolution sort with a fallback chain | one selector function |
| [**dash.js**](https://github.com/Dash-Industry-Forum/dash.js) | `_filterByPossibleBitrate` / `_filterByPortalSize`; `CapabilitiesFilter` | rules collection → `getMinSwitchRequest`: **conservative min** within a priority tier (STRONG / DEFAULT / WEAK) | a fixed rule list |
| [**rx-player**](https://github.com/canalplus/rx-player) | `isRepresentationPlayable` (decipherable + codec); representation locking narrows to an ID set | soft throttle / resolution limits (with fallback), then a fixed **precedence cascade** of bandwidth / buffer / guess estimators | a hardcoded selector |
| [**OSMF**](https://sourceforge.net/adobe/osmf/svn/HEAD/tree/) | `maxAllowedIndex` applied after the rules | `SwitchingRules` → manager takes the **minimum recommended index** (most conservative wins; `-1` = no opinion) | a fixed rule list |
| [**media3 / ExoPlayer**](https://github.com/androidx/media) | `SELECTION_ELIGIBILITY_NO` (capability, or constraints when relax is off) | **multi-key comparison** (`ComparisonChain`) — each key breaks ties left by the one before; soft constraints are rankable keys with graceful fallback (`exceedConstraintsIfNecessary`) | a hardcoded comparator |
| [**VLC**](https://github.com/videolan/vlc) | `RepresentationSelector` resolution / bitrate bounds (shared filter pass, fallback-to-lowest) | a single `AbstractAdaptationLogic` chosen up front by config (`adaptive-logic`: rate-based / near-optimal / predictive / …) — not composed | a swappable whole-algorithm strategy |

Four things this tells us:

1. **The hard/soft split is universal**, not our invention — it *is* the prune-then-rank pipeline this
   doc assumes. A hard filter (`forbidden`) before any ranking is the declarative form of what every
   engine encodes imperatively as "survived the pruning pass."

2. **No one adds up the criteria into a single score.** dash.js and OSMF — the two genuine rule systems
   (OSMF is dash.js's ancestor) — take the most cautious (lowest) recommendation across rules within a
   priority tier, not a weighted total; ExoPlayer ranks on one criterion and uses the next only to break
   ties; rx-player consults its bandwidth / buffer / guess estimators in a fixed order of precedence.
   This is why this doc compares only *two* models: a "give every track a number and add the criteria up"
   approach has no precedent and would mix things that can't share one scale — a language preference and a
   throughput estimate aren't measured in the same units.

3. **Both models under comparison are proven shapes.** Filter + Sort's chain of stable sorts is
   essentially ExoPlayer's `ComparisonChain` over `isWithinConstraints` / `preferredLanguage` / `bitrate`
   — rank on one criterion, fall back to the next as a tiebreaker, with graceful fallback when constraints
   leave nothing (rx-player's precedence cascade is the same idea). Preference Tiers' tier-then-rank is
   essentially dash.js / OSMF's priority tiers (STRONG / DEFAULT / WEAK) with the most-cautious pick within
   a tier, and Shaka's filter-then-rank narrowing. So the choice here is between two battle-tested shapes,
   not between a safe option and an experiment.

4. **What none of them have is per-rule composability.** Every engine's combination logic is a *central,
   hardcoded* function — ExoPlayer's comparator, dash.js's `getMinSwitchRequest`, OSMF's `checkRules`,
   rx-player's `getCurrentEstimate`, hls.js's clamps. VLC is the only pluggable one, but at the
   whole-algorithm level (`adaptive-logic` swaps a single `AbstractAdaptationLogic`), which can't express
   a concern that must *stack* with ABR rather than replace it (multi-CDN failover isn't "a different ABR
   algorithm"). That's fine for a player with a fixed feature set; SPF is a composition framework where
   features arrive *by composition*, so the combination policy has to be expressible as independent,
   feature-owned rules. This requirement is **independent of the model choice** — both Filter + Sort and
   Preference Tiers deliver per-rule composability; the engines only establish that the underlying
   combination policies are sound.

*Scope: surveyed independent JS engines, native mobile (media3), native desktop (VLC), and the Flash-era
ancestor (OSMF). Excluded UI wrappers (Vidstack, Plyr, Media Chrome, Mux Player) — they delegate
selection to one of these — and native black boxes (AVPlayer / Apple HLS) that aren't inspectable.*
