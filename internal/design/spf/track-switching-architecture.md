---
status: draft
date: 2026-05-28
---

# Track switching architecture

How `selectedVideoTrackId` / `selectedAudioTrackId` get written when multiple features want a say.

## Problem

Track selection started simple — one writer per slot, one default-picker behavior per type. As features accumulate, multiple decision domains converge on the same slot:

- Bandwidth-driven ABR (`video-abr`, `audio-abr`)
- Consumer-driven preference (`userVideoTrackSelection`, `userAudioTrackSelection`)
- Capability physics (`capability-probing`)
- Codec policy (`hevc-variant-selection`, `5.1-surround-selection`)
- Delivery policy (`rendition-selection-caps`, `multi-signal-abr`)
- CDN routing (`multi-cdn-failover`, `content-steering`)
- Default-language picking (`multi-language-audio`)

Today `setupTrackSwitching` reads exactly one filter slot per variant (`userVideoTrackSelection` for video, `userAudioTrackSelection` for audio). Each upcoming feature would either need a new writer competing on the same slot or a new conditional branch in the existing writer — both paths lead to unmaintainable proliferation or a centralized monolith that grows a new branch per feature.

This doc proposes the shared substrate: track selection as a **filter/sort pipeline** over the candidate track list, with each feature contributing rules that a composer merges.

## Out of scope

- Buffer-side mechanics (flush orchestration, `changeType()`, MSE pipeline). Owned by segment-loader actor logic; separate design surface.
- Bandwidth-state sampling and multi-writer slot semantics. Orthogonal to selection.
- Source-replacement lifecycle. Already handled by reactor state-exit.
- Text-track selection. Text uses a DOM-driven multi-writer shape (see [`text-track-architecture.md`](./text-track-architecture.md)) not currently folded into this substrate. May be incorporated later.
- Engine error-handling. How an empty eligible set (cascade step 2) and other failures surface — error state, cause attribution, recoverability, whether a given empty slot is even fatal — is owned by the engine error model. The substrate only detects the outcome and hands it off.
- User-intent persistence and conflict *policy* — whether/how remembered preferences carry across sources (in-session vs. durable), and any conflict resolution among multiple user-intent inputs. The substrate stays resilient to these (see [User-intent inputs](#user-intent-inputs)); the policies are consumer/feature decisions.

## Solution

Track selection for a given type is a pipeline:

```
candidate tracks → [rule] → [rule] → ... → composer → picked track id
```

Each rule contributes filter and/or sort opinions over the candidate set. The composer merges outputs from all rules and produces a composite ordering; the writer behavior reads the head and writes the selection slot.

A rule can contribute:

- **Filter only** — `capability-probing` excludes unsupported tracks; no preference among the remainder.
- **Sort only** — `multi-signal-abr` orders tracks by weighted signal fusion; doesn't exclude any.
- **Both** — `multi-cdn-failover` excludes failed-CDN tracks AND orders the rest by pathway priority.

Each feature owns one or more rules. The substrate doesn't care which feature a rule came from; rules compose by their declared opinions.

### Framework-agnostic ambition

Conceptually rules and the composer are pure data transformations — candidate list in, ordered list out. The aspiration is for both to live in the framework-agnostic media layer (`packages/spf/src/media`), independent of SPF core primitives (signals, reactors, behaviors). The SPF integration — how rule outputs reach the writer behavior, how reactive re-evaluation triggers, how rules are constructed and wired into an engine — sits one layer up and is intentionally undesigned at this stage.

## Rule output

```ts
type RuleOutput = {
  preferred?: TrackId[];
  preferredRanked?: boolean;
  allowed?: TrackId[];
  forbidden?: TrackId[];
};
```

- **`preferred`** — tracks this rule positively picks. `preferredRanked: true` means the order matters; `preferredRanked: false` means set-membership only.
- **`allowed`** — tracks this rule has an ordered second-class opinion about. When populated, order is always meaningful. When the rule has no ordering opinion about non-preferred tracks, it omits `allowed`.
- **`forbidden`** — explicit hard exclusion. No other rule's preference can rescue a forbidden track.
- **Anything not listed** — implicit "no opinion / acceptable to this rule." Falls through to other rules.

### Why not a flat filter+sort chain

The leanest possible rule is `(tracks) => tracks` — filter some out, sort the rest, and chain the rules together. We reject it because a flat ordered sublist is **lossy**: it collapses three distinctions the composer needs into a list that can't be read back — binding vs. recoverable exclusion, ordering-as-opinion vs. ordering-as-artifact, and neutrality.

The sharpest failure is mixed hard/soft exclusion. `capability-probing` dropping an undecodable HEVC track is binding; `userAudioTrackSelection: { language: 'es' }` dropping the non-Spanish tracks is soft. As `.filter()`, the two are indistinguishable — so when the soft filter over-narrows (no Spanish track exists), the chain empties and playback dies, even though decodable tracks remained. A flat list also can't separate *unplayable* (everything hard-excluded — should error) from *over-narrowed* (a soft preference matched nothing — should degrade); both are just `[]`.

Two related failures: multiple rankers (`video-abr`, `multi-signal-abr`, a height preference) each `.sort()` the whole list, so the last clobbers the rest rather than merging; and a pure-exclusion rule forced to return *some* order leaks a phantom ranking it doesn't hold.

Filter+sort suffices for pure hard exclusions, or a single ranker. It breaks exactly at mixed hard/soft exclusion and contending rankers — both guaranteed by the pressure list. `{ preferred, allowed, forbidden, preferredRanked }` is the minimal metadata that keeps composition non-lossy: each field carries one distinction the flat list discards.

### Why absence = neutrality, forbidden = explicit

Soft preferences need it. `userAudioTrackSelection: { language: 'es' }` wants to express "Spanish preferred" without forbidding every non-Spanish track. If absence implied forbidden, every soft preference rule would have to enumerate the entire non-preferred set, defeating the natural composition where multiple rules' opinions stack on the same candidate.

Hard exclusion stays small and bounded. Rules that need to exclude (capability-probing, multi-cdn during cooldown) iterate the candidate set anyway; enumerating forbidden tracks explicitly is no extra work.

### Why no cross-rule scoring

Scoring is the tempting alternative — one weighted sum, `argmax(Σ wᵢ·scoreᵢ)`, is mechanically simpler than the cascade and would likely win on size (E) and simplicity (D). We reject it on the axes that matter more here.

Scores imply a common currency that doesn't exist: ABR's "fits margin by 1.4×" has no shared unit with "preferred-language match" or "primary CDN pathway." A weighted sum forces them onto one scale, and the weights *are* the policy — now opaque float magnitudes instead of a declarative per-rule contract a reader can understand once (axis C).

Worse, it relocates the relationship problem rather than solving it (axis A). Adding a rule means re-tuning *every* weight, since each rule's score is only meaningful relative to the others — the same N² coupling we rejected ad-hoc for, now implicit and global instead of a local insertion into the precedence list.

And hard constraints aren't low scores — a forbidden track is a *gate*, not a small number. Scoring fakes that with ±∞ sentinels that poison the sum, collapsing the binding-vs-recoverable distinction. This is the mirror of the flat-filter+sort failure: filter+sort can't represent *enough*; scoring represents everything on a *false* scale. The categorical model sits between — `forbidden` is a distinct binding kind, preferences are recoverable and ranked. It also keeps the pick explainable — a causal chain ("forbidden by capability, out-ranked by ABR") rather than an emergent "the sum was highest," which matters for field-debugging a selection (axis B).

Rules can still score *internally* (ABR's bandwidth math, multi-signal-abr's signal fusion) — they just don't expose scores as the composition currency. Scores stay private; outputs are categorical (preferred / allowed / forbidden) plus optional within-set ordering.

### Why a distinct `allowed` tier

Folding `allowed` into a single sorted `preferred` collapses two orthogonal axes into one: the **tier** (safety / eligibility — composed pessimistically, so a track is composite-`preferred` only if every opining rule prefers it) and the **order** (within a tier — composed by precedence). A full-ranking rule like ABR then becomes greedy: its only lever is rank-position, so at low precedence a soft preference (a height pick, say) can override ABR's safety verdict and force a below-margin track. The distinct tier keeps ABR's safety *veto* (the tier) separate from its quality *ranking* (the order) — the veto always binds; the ranking composes as one voice among peers. That separation is irreducible in a composed model, and it's the whole reason `allowed` exists.

So reach for `allowed` deliberately, and expect it to be rare:

- **Threshold rules** — ABR-family (throughput, BOLA/buffer, dropped-frames): partition tracks into safe (`preferred`) and risky-but-usable (`allowed`, ranked).
- **Ordered-fallback rules** — content-steering's pathway priorities: top pathway `preferred`, lower pathways `allowed` as a ranked fallback tier.

Everything else wants `preferred` + `forbidden` + implicit leftover. A soft set-preference with no ordered fallback — caps-soft, language, basic multi-CDN's active-CDN set — never needs `allowed`; its non-preferred tracks fall through as implicit-eligible.

### Why `preferred` has a rank flag but `allowed` doesn't

`preferred` has both ranked and unranked use cases. Unranked: `userAudioTrackSelection: { language: 'es' }` prefers Spanish but has no opinion among Spanish tracks. Ranked: `multi-language-audio`'s default picker prefers `preferredLang` → `DEFAULT=YES` → first, an ordered preference. Both are real.

`allowed` doesn't need the same distinction. "Explicit unranked second-tier" yields the same composite treatment as "no opinion / falls through to other rules' opinions" — so we collapse the former into the latter. `allowed` is only worth populating when the rule has ordering opinions about that set; when populated, ordering is always meaningful.

## Categorization

Each rule belongs to a category. The category is a meta-classification — it tells the composer how to *interpret* the rule, not what the rule's track-level preferences are. Today's load-bearing distinction is **user-intent vs system**:

- **`user-intent`** — consumer-driven rules. The consumer writes a slot (`userAudioTrackSelection`, `userVideoTrackSelection`, future siblings) expressing intent. The composer treats dropped user-intent preferences as sticky: when a higher tier narrows to empty, the dropped preferred set biases the next tier's ordering. Other category-specific concerns (persistence across sources, signal subscription scope, debugging surface) live outside the composer.
- **`system`** — engine-derived rules. ABR, caps, capability-probing, codec selection, multi-cdn, content-steering, etc. The composer treats dropped system preferences as not-sticky: a system rule's preferred tier yields to its own `allowed` tier (which already encodes that rule's fallback opinion) without biasing further tiers.

Why this distinction matters: user intent is intent-bearing — honoring it partially when possible is friendlier than dropping it entirely. System policy is computed-from-conditions — if conditions don't match, the policy yields without trying to preserve its prior opinion across tier transitions.

The category set is intentionally narrow at the start (two values). New categories can be added if new composer-visible behaviors emerge, without changing the rule output shape itself. Other category-specific concerns (persistence across sources, signal subscription scope, error/debug surfaces) live outside the composer.

**Where the category lives — at the composition-definition level.** Category exists for one reason: to mark which rules get the *honor-if-possible* treatment. The load-bearing invariant is two steps — (1) `forbidden` is an absolute hard floor; (2) `user-intent` preferences are honored whenever they survive (1) — and everything else in the cascade is just how to choose among the survivors. So category encodes a rule's *role* in the composition (privileged user intent vs. plain policy): structural and stable, not data a rule recomputes per invocation.

That places it on each **rule entry in the composition definition** — not on per-invocation output (which would restate a constant every tick), and not baked into the rule's own type (so the same rule stays reusable across compositions):

```ts
// illustrative — the entry/rule shape is the rule-attachment question, not this one
defineSelection({
  rules: [
    { category: 'user-intent', rule: userVideoSelection },
    { category: 'system',      rule: videoAbr },
  ],
})
```

Whether each `rule` resolves to a pure function or an object is the [rule-attachment question](#rule-attachment-and-reactivity); either way the category tag lives on the definition's entry. Definition-level category is available both before and after a rule runs, so it neither requires nor forecloses the pre-invocation policies the earlier framing worried about.

## Composition cascade

The composer's job: take rule outputs (with their categories), produce a single ordered list of track ids. The writer picks the head.

Working policy:

1. **Forbidden union.** Any rule's `forbidden` set removes from the candidate set. Hard exclusion. Composes by union across all rules — no other rule's preference can rescue a forbidden track.
2. **Eligible-set check.** If forbidden union covers every track, the slot has no eligible track; the cascade stops and the substrate reports this empty-eligible outcome. How it surfaces — and whether it's even fatal (a video slot is empty by design in audio-only) — is engine error-handling ([out of scope](#out-of-scope)).
3. **Tier classification (pessimistic).** For each non-forbidden track, the composite tier is the worst classification any rule made. If any rule emits `allowed` for the track, composite tier is allowed. If all rules with opinions emit `preferred`, composite tier is preferred. Tracks no rule has opinions on land in implicit no-opinion / acceptable.
4. **Within-tier ordering (lex by precedence).** Rules are ordered (rule-list array order = precedence). Among tracks in the same composite tier, the earliest rule with a ranked opinion about a track wins. Ties break to the next rule with an opinion. Unranked-preferred rules don't contribute ordering — only filtering — so they're transparent to within-tier ordering.
5. **Fall-through cascade.** If composite preferred is empty but composite allowed is non-empty, the writer picks from composite allowed. If composite allowed is also empty, the writer picks from no-opinion / eligible-set tracks. Cascade applies automatically; soft preferences yield gracefully when they over-narrow.
6. **Bias on fall-through for user-intent.** When the cascade falls through to a lower tier, user-intent rules' dropped preferred sets bias the next tier's ordering — tracks that were user-preferred surface earlier within the fall-through tier. System rules' dropped preferences are simply dropped; the system rule's own `allowed` tier already encodes its fallback.

The cascade gives: hard failure when nothing is playable, graceful degradation when preferences over-narrow, partial honoring of user intent when the strict version can't be satisfied.

### Two distinct empty modes

The pipeline can narrow to empty in two qualitatively different ways:

- **Eligible-set empty** (forbidden union covers everything): every track is hard-excluded for a real reason, so the cascade can't recover. The substrate reports the empty-eligible outcome; the engine error model takes it from there ([out of scope](#out-of-scope)).
- **Preferred / allowed empty but eligible set non-empty:** soft preferences over-narrowed; there are still pickable tracks. Cascade falls through gracefully; engine plays. User intent dropped along the way biases the fall-through tier.

The model encodes the distinction structurally: `forbidden` is explicit and binding; `preferred` and `allowed` yield. Composition just has to honor it.

## Scenario

A single worked example to make the cascade concrete.

Source tracks:
- `A`: 1080p, AVC, English
- `B`: 720p, AVC, English
- `C`: 480p, AVC, English
- `D`: 720p, HEVC, Spanish

Engine config: `maxHeight: 1080` (hard cap), HEVC unsupported, current bandwidth fits 720p comfortably.

Active rules in array order (precedence top-down):

1. `capability-probing` *(system)* — `{ forbidden: [D] }` (HEVC unsupported)
2. `rendition-selection-caps` *(system, hard)* — `{ preferred: [A,B,C,D], preferredRanked: false }` (no tracks above cap)
3. `hevc-variant-selection` *(system, force-AVC, hard)* — `{ preferred: [A,B,C], preferredRanked: false, forbidden: [D] }`
4. `userVideoTrackSelection: { height: 720 }` *(user-intent, soft)* — `{ preferred: [B,D], preferredRanked: false }`
5. `video-abr` *(system)* — `{ preferred: [B], preferredRanked: true, allowed: [C, A] }`
6. `multi-signal-abr` *(system)* — `{ preferred: [B, C, A], preferredRanked: true }`

**Forbidden union:** `{D}` (from rules 1 and 3).

**Tier classification (pessimistic) per non-forbidden track:**

| Track | rule 1 | rule 2 | rule 3 | rule 4 | rule 5 | rule 6 | Composite |
|---|---|---|---|---|---|---|---|
| A | – | preferred | preferred | – | allowed | preferred | **allowed** (rule 5 downgrades) |
| B | – | preferred | preferred | preferred | preferred | preferred | **preferred** |
| C | – | preferred | preferred | – | allowed | preferred | **allowed** (rule 5 downgrades) |

(`–` = no opinion.)

**Within-tier ordering:**

- Composite preferred = `{B}` — single track, no merge needed.
- Composite allowed = `{A, C}`. Earliest-precedence rule with a ranked opinion is rule 5 (ABR): `[C, A]`. That wins.

**Final ordered list:** `[B, C, A]`. Writer picks `B`. Forbidden: `{D}`.

This honors `height: 720` preference, ABR's safety margin verdict for B, and falls back through C → A if B becomes unavailable.

## Audit

Each in-scope feature's rule output:

```ts
// capability-probing (category: system) — pure filter, hard
{ forbidden: [...unsupported] }

// rendition-selection-caps (category: system, soft)
{ preferred: [...within-cap], preferredRanked: false }

// rendition-selection-caps (category: system, hard)
{ preferred: [...within-cap], preferredRanked: false,
  forbidden: [...above-cap] }

// userVideoTrackSelection / userAudioTrackSelection (category: user-intent, soft)
{ preferred: [...matching], preferredRanked: false }

// userXTrackSelection (category: user-intent, hard variant)
{ preferred: [...matching], preferredRanked: false,
  forbidden: [...non-matching] }

// multi-language-audio default picker (category: system) — 3-tier preference via ranking
{ preferred: [preferredLang, ...DEFAULT-tracks, ...first-fallback],
  preferredRanked: true }

// video-abr / audio-abr (category: system)
{ preferred: [...above safety margin, descending by bandwidth-fit],
  preferredRanked: true,
  allowed: [...below margin, ascending bitrate w/ resolution tiebreak] }

// multi-cdn-failover (category: system) — active-CDN as a preferred set;
// other CDNs' tracks fall through as implicit-eligible (no allowed needed)
{ preferred: [...active-CDN], preferredRanked: false,
  forbidden: [...failed-CDN during cooldown] }

// content-steering (category: system) — ordered pathway priorities;
// lower pathways are an explicit ranked fallback tier
{ preferred: [...top-priority pathway], preferredRanked: false,
  allowed: [...lower-priority pathways ordered by steering priority] }

// hevc-variant-selection (category: system, force-AVC, hard)
{ preferred: [...avc], preferredRanked: false, forbidden: [...hevc] }

// 5.1-surround-selection (category: system, force-stereo, soft)
{ preferred: [...stereo], preferredRanked: false }

// multi-signal-abr (category: system) — pure sort
{ preferred: [...all tracks ordered by weighted signal fusion],
  preferredRanked: true }
```

Of the in-scope features, only `userVideoTrackSelection` / `userAudioTrackSelection` (and future siblings) are `user-intent`. Everything else is `system`.

## Why a substrate, not ad-hoc rules

The cheaper path is to stay ad-hoc: one writer per slot, plus a bespoke combination function each time two decision domains must co-decide. Today's code ([#1605](https://github.com/videojs/v10/pull/1605)) is a single-writer-with-filter seed of this — `switchVideoTrack` / `switchAudioTrack` own their slots via the unified `setupTrackSwitching`, and consumer intent enters through sibling `userVideoTrackSelection` / `userAudioTrackSelection` filter slots rather than competing writers. (The ABR-free `selectVideoTrack` is the mutually-exclusive alternative — compose it *or* `switchVideoTrack`, not both.) The moment capability filtering, codec policy, caps, and ABR must *all* constrain one pick, that model needs a branch-per-domain in the single writer, or a hand-written combiner.

Rules cost something on their own — mostly size (E): a composition that never needs multi-CDN failover shouldn't carry its rule. But that cost is per-composition, and ad-hoc scopes it for free, since each composition hand-writes only the domains it uses. What ad-hoc *can't* scope is the **relationships between rules** — each new domain may interact with every existing one, re-hardcoded in the combiner every time one lands.

So the substrate has two co-equal jobs: collapse that pairwise hand-coded surface into per-rule declarations plus one composer, *and* keep each composition carrying only the rules it uses. The second isn't a nicety — pay-for-what-you-compose is a value SPF already holds (engines compose only the behaviors they need; the audio-only engine subtracts video selection entirely). A substrate that bought relationship composition by making every composition carry every rule would trade one core value for another.

That's the axis-A bet (reusability under feature pressure): the [pressure list](./evaluation-axes.md#pressure-list-axis-a-target) enumerates these exact features — multi-language audio, audio ABR, multi-CDN failover, codec capability, rendition caps — so the variation isn't speculative. The documented A-vs-D tension rule decides it: *when the assumption is on the pressure list, A wins.* Hardcoding the relationships fails the one axis the pressure list exists to defend.

The substrate isn't free, and the remaining [axes](./evaluation-axes.md) police its shape rather than its existence:

- **Simplicity (D):** the composer and cascade are more machinery than any single feature needs. Every part of the output shape and cascade should trace to a specific pressure-list interaction; parts that don't are gold-plating.
- **Size (E):** the ABR-free `selectVideoTrack` keeps the bandwidth estimator and quality-selection out of the bundle. The unified `setupTrackSwitching` already imports them at module top, so composing `switchAudioTrack` (no audio ABR yet) drags ABR in regardless — a single composer all rules flow through generalizes that pressure. Preserving tree-shaking is a design constraint (see [Open questions](#tree-shaking-the-composed-pipeline)).

Precedence also becomes explicit (rule order) instead of ordering-by-accident, and "how two domains co-decide a track" is learnable once instead of re-invented per feature pair — axes B and C.

### The rejection ladder

Three progressively finer alternatives, each rejected for a distinct reason:

| Alternative | Rejected because |
|---|---|
| Ad-hoc hand-coded relationships | re-hardcodes the pairwise interaction surface per feature (this section) |
| [Flat filter+sort chain](#why-not-a-flat-filtersort-chain) | a flat ordered list is lossy — *too little* structure |
| [Cross-rule scoring](#why-no-cross-rule-scoring) | a weighted sum is a false common scale — the *wrong* structure |

Filter+sort and scoring are the two opposite failure modes the categorical rule output threads between.

## Prior art

Every major HTTP-adaptive-streaming engine separates **hard constraints (a pruning pass) from soft ranking**, and none combines decision sources with weighted-sum scoring. They differ in the combination *policy*, and — decisively for us — none composes those criteria as independent, feature-owned rules.

| Engine | Hard exclusion | Soft combination policy | Criteria are… |
|---|---|---|---|
| [**Shaka**](https://github.com/shaka-project/shaka-player) | `getPlayableVariants()` gate (`filterManifest` + `applyRestrictions`); two typed errors | preference narrows the set, then a *single* bandwidth ranker (`SimpleAbrManager`) | a fixed pipeline |
| [**hls.js**](https://github.com/video-dev/hls.js) | codec-unsupported levels removed from the manifest | one ABR ranker + min/max **index clamping** (cap-level, HDCP, min-bitrate each write a clamp) | hardcoded controllers |
| [**VHS**](https://github.com/videojs/http-streaming) | `excludeUntil === Infinity` (`isIncompatible` / `isEnabled`) | bandwidth + resolution sort with a fallback chain | one selector function |
| [**dash.js**](https://github.com/Dash-Industry-Forum/dash.js) | `_filterByPossibleBitrate` / `_filterByPortalSize`; `CapabilitiesFilter` | rules collection → `getMinSwitchRequest`: **conservative min** within a priority tier (STRONG / DEFAULT / WEAK) | a fixed rule list |
| [**rx-player**](https://github.com/canalplus/rx-player) | `isRepresentationPlayable` (decipherable + codec); representation locking narrows to an ID set | soft throttle / resolution limits (with fallback), then a fixed **precedence cascade** of bandwidth / buffer / guess estimators | a hardcoded selector |
| [**OSMF**](https://sourceforge.net/adobe/osmf/svn/HEAD/tree/) | `maxAllowedIndex` applied after the rules | `SwitchingRules` → manager takes the **minimum recommended index** (most conservative wins; `-1` = no opinion) | a fixed rule list |
| [**media3 / ExoPlayer**](https://github.com/androidx/media) | `SELECTION_ELIGIBILITY_NO` (capability, or constraints when relax is off) | lexicographic **multi-key comparison** (`ComparisonChain`); soft constraints are rankable boolean keys with graceful fallback (`exceedConstraintsIfNecessary`) | a hardcoded comparator |
| [**VLC**](https://github.com/videolan/vlc) | `RepresentationSelector` resolution / bitrate bounds (shared filter pass, fallback-to-lowest) | a single `AbstractAdaptationLogic` chosen up front by config (`adaptive-logic`: rate-based / near-optimal / predictive / …) — not composed | a swappable whole-algorithm strategy |

Four things this tells us:

1. **The hard/soft split is the universal pattern**, not our invention. Our `forbidden`-union-before-preferences is its declarative form — what every engine encodes imperatively as "survived the pruning pass." Shaka and rx-player also distinguish *causes* of unplayability (`CONTENT_UNSUPPORTED_BY_BROWSER` vs `RESTRICTIONS_CANNOT_BE_MET`; `noPlayableRepresentation` vs `noPlayableLockedRepresentation`) — useful precedent for the engine error model that consumes our empty-eligible outcome ([out of scope](#out-of-scope)).
2. **No one uses scoring.** dash.js and OSMF — the two genuine rule systems (and OSMF is dash.js's ancestor) — combine categorical indices by *conservative min*, not a weighted sum; media3 ranks lexicographically and rx-player combines its bandwidth / buffer / guess estimators by precedence — also not sums. Unanimous external support for [Why no cross-rule scoring](#why-no-cross-rule-scoring).
3. **Lexicographic multi-key merge is proven** — by ExoPlayer. Its `ComparisonChain` over `isWithinConstraints` / `preferredLanguage` / `bitrate` keys, with graceful fallback when constraints over-narrow, is a close cousin of our within-tier lex-by-precedence plus fall-through. So our merge *semantics* aren't exotic. (dash.js / OSMF's conservative-min is a *simpler* policy — a live data point for whether our tiering earns its keep.)
4. **The novelty is composability — at the right granularity.** Most engines' combination logic is a *central, hardcoded* function — ExoPlayer's comparator, dash.js's `getMinSwitchRequest`, OSMF's `checkRules`, rx-player's `getCurrentEstimate`, hls.js's clamp. VLC is the lone one that's *pluggable* — but at the whole-algorithm level (`adaptive-logic` swaps a single `AbstractAdaptationLogic`), which can't express a concern that must *stack* with ABR rather than replace it (multi-CDN failover isn't "a different ABR algorithm"). None expresses the criteria as **independent, feature-owned rules that compose**. That's fine for them — they're players with a fixed feature set, so one hardcoded chain (or one swappable strategy) suffices. SPF is a composition framework where features arrive *by composition*, so the same proven semantics have to be pluggable per-rule — axis A is exactly why we need as composable rules what they could hardcode or swap wholesale.

*Scope: surveyed independent JS engines, native mobile (media3), native desktop (VLC), and the Flash-era ancestor (OSMF). Excluded UI wrappers (Vidstack, Plyr, Media Chrome, Mux Player) — they delegate selection to one of these — and native black boxes (AVPlayer / Apple HLS) that aren't inspectable.*

## Open questions

### Rule attachment and reactivity

The shape and location of "a rule" as a runtime entity. Several plausible decompositions; the choice cuts across:

- **Pure-function rules vs object-with-metadata rules.** Pure functions are the leanest contract; pairing them with category metadata requires a wrapper (registration shape, decorator, etc.).
- **Reactive triggering.** When does the composer re-run? Rule-supplied signals, push from rules, pull on engine ticks? The framework-agnostic ambition argues for not committing to one reactive model in the substrate itself.
- **Where rules live.** Aspiration: `packages/spf/src/media/...` (DOM-free, core-free). The SPF integration (signals, behaviors) sits one layer up — likely in `packages/spf/src/playback/behaviors/track-switching.ts` or its successor.
- **Where the composer lives.** Same aspiration: framework-agnostic media-layer code if possible, with SPF-adjacent code handling the reactive plumbing on top.

These are coupled. Worth designing together rather than in isolation. **None pinned.**

### Tree-shaking the composed pipeline

The ABR-free `selectVideoTrack` keeps ABR (bandwidth estimator, quality-selection) out of the bundle — axis E for free. The #1605 unification already eroded this: `setupTrackSwitching` statically imports the ABR machinery, so composing `switchAudioTrack` pulls it in even though audio ABR isn't implemented. A single composer that every rule flows through generalizes the problem — all rules risk landing in the bundle regardless of which an engine uses. Candidate shapes: rules as à-la-carte composables the engine opts into (composer degrades to a no-op pass when only one rule is present); subpath splitting per rule; or accepting the cost for engines that adopt the substrate while leaving the simple `selectXTrack` path untouched. **Open.**

### Hysteresis location

"Don't switch tracks for small changes" — collapsed earlier into "stay with current unless a strictly-higher tier opens." The substrate stays resilient to either placement via one requirement: **prior selection state is available in the evaluation context** — at minimum the current selected track, more generally whatever prior state a hysteresis policy reads (e.g. time-since-last-switch for a temporal variant). Given that, both placements work:

- **Rule-internal** (lean): ABR-family rules own the up-switch margin/interval and shape their own `preferred`/`allowed` partition so the current track stays preferred until a higher one clears margin. Matches every incumbent (hls.js, dash.js, ExoPlayer, rx-player) and today's `setupTrackSwitching`. The "duplicated by every rule" worry doesn't bite — ABR is the only continuously-churning rule; episodic rules (user intent, capability, caps, CDN, steering) should propagate promptly, not be damped.
- **Composer post-stage**: a tier-aware sticky-current bias reading the prior pick — available as a fallback if a non-ABR continuous-churn source ever emerges.

Placement is an out-of-scope implementation choice; the only architectural requirement — prior selection in the evaluation context — is a constraint the [rule-attachment context contract](#rule-attachment-and-reactivity) must honor. **Resolved (resilience-stated); placement deferred.**

### User-intent inputs

The substrate stays resilient to both *remembered preferences across sources* and *multiple user-intent inputs* without committing to either, via four invariants the design already satisfies:

1. User intent is expressed as partial-track **descriptors**, never resolved track ids — so it re-matches against each new source (ids can't carry across sources).
2. The intent input is **separate from the resolved slot and isn't cleared on source change** — resolution is ephemeral; intent persists and is re-matched.
3. `user-intent` is a **category any number of rules may carry**; the composer never special-cases a single user-intent rule, so N inputs compose like one.
4. Competing intents — and their fall-through biases — **resolve by precedence**, the same mechanism as one rule. Precedence already honors *both* when a track satisfies both; it drops the lower only when they genuinely conflict.

Given these, multiple inputs compose like any rules, and both a multi-field descriptor (`{language, height}`) and several precedence-ordered descriptors are supported. The actual *policies* — in-session vs. durable persistence, sticky-through-unsatisfiable behavior, which descriptor shape a consumer reaches for — are [out of scope](#out-of-scope).

**Residual open:** whether competing intents ever need resolution *beyond* precedence — a "maximize-satisfied" / count-the-matches policy. That's count-based and in tension with [no cross-rule scoring](#why-no-cross-rule-scoring); flagged for separate resolution, not assumed either way.

## Status

- **Composition:** Not implemented. Today's `setupTrackSwitching` reads one filter slot per variant; the rule-pipeline substrate proposed here generalizes that pattern across more features.
- **Definition depth:** Draft — output shape and composition cascade pinned; rule attachment, framework boundary, and several composer-adjacent concerns still open.

## See also

- [`features/`](./features/) — in-scope features each have registry entries
- [`conventions/signals.md`](./conventions/signals.md) — multi-writer slot conventions, per-behavior read/write intent
- [`conventions/behaviors.md`](./conventions/behaviors.md) — behavior shape and per-type specialization patterns
- [`text-track-architecture.md`](./text-track-architecture.md) — parallel architectural deep-dive; text uses an intent+default multi-writer model not yet folded in here
- [`packages/spf/src/playback/behaviors/track-switching.ts`](../../../packages/spf/src/playback/behaviors/track-switching.ts) — current `setupTrackSwitching` + `switchVideoTrack` / `switchAudioTrack`
