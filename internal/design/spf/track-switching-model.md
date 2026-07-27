---
status: draft
date: 2026-06-04
---

# Track switching: the selection rule model

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
branch in a central picker — both lead to a monolith that grows a branch per feature. The substrate that
avoids this is a **pipeline**: a candidate track list flows through feature-contributed *rules* into a
composer that produces the ordered list whose first entry becomes the selection.

This document recommends a specific rule model for that pipeline — the shape of an individual *rule* and
how rules combine into a final pick. The two are a package: a rule shape implies a way of combining
rules. The model here is **a hard pruning pass followed by a chain of soft, narrowing rules and one
ranker** — Filter + Sort, with the hard exclusions split out into their own *constraints* phase and the
remaining rules allowed to narrow softly rather than only reorder.

```
candidate tracks
  → [ constraints ]        hard pruning — anything that can't play here is gone
  → [ rule ] → [ rule ] …  soft narrowing + ranking, in one ordered chain
  → pick                   the first surviving track
```

## The shape in two phases

**Constraints run first.** A constraint is rule-shaped, but its exclusion is *hard*: never attempt to
play a track it removes. Constraints are the things that mean "can't play here" — a codec or DRM the
environment can't decode, or a CDN that's failing and in cooldown. They are pooled and applied up front,
before any preference is consulted. Because every constraint only ever removes the unplayable, the order
they run in can't change the outcome, and a track that survives the pass is guaranteed playable.

**Rules run next, in one ordered chain.** A rule over the surviving set is one of two things:

- A **soft filter** narrows the running set to the tracks it wants — *unless that would empty the set, in
  which case it's skipped and the set is left as it was* (it falls through). Two soft filters compose by
  narrowing one after the other, each against what the previous one left. A soft filter is how a
  *preference* is expressed: restrict to what's wanted, but never to nothing.
- A **sort** reorders the running set by some criterion. Sorts here are *stable* — a stable sort leaves
  the existing order untouched among tracks it can't tell apart, so an earlier sort's ordering survives as
  the tiebreak under a later one. `abr` is the ranker: of the fitting tracks, highest quality first;
  over-throughput tracks after, least-over first.

The pick is the first track left in the running set after the whole chain has run.

**Early-bail.** A soft filter that narrows the set to exactly one track has already decided the pick —
there's nothing left to choose among, so the chain can stop there. This is the same rule as "skip a
filter that would empty the set," read from the other end: zero survivors means skip, one survivor means
done. Placing the `abr` ranker last means narrowing finishes first, so a single-survivor bail happens
*before* the expensive throughput estimate ever runs.

### Which end of the chain is authoritative

In a chain of pure sorts, the *last* sort wins — it gets the final say on order. Soft filters invert
that. When two soft filters disagree — say a user picked 1080p and a codec policy prefers AVC, and no
track is both — the one applied **first** wins: it narrows to 1080p, then the AVC filter finds nothing
matching within that set and falls through, leaving the user's 1080p intact. Applied in the other order,
AVC would win and the user's pick would be the one to fall through.

So the rule chain reads **most authoritative first**: the user's explicit selection ahead of policy,
policy ahead of defaults, with the `abr` ranker last (its position doesn't fight anything — a sort only
reorders what survives, and putting it last is what enables early-bail). This is the reverse of the
last-sort-wins reading, and it's a direct consequence of preferences narrowing rather than reordering.

Read "most authoritative first" as a **rough heuristic for ordering the chain, not a fixed contract.**
It's generally right, and a good default to reach for, but the exact order is expected to shift with real
use cases and learnings — a given user selection might sensibly sit *after* some policy rule, and rules
that interact with `abr`'s fits-vs-over split (a resolution cap, for one) complicate the simple
authority gradient. The order is a starting assumption to refine, not a settled ranking.

## The rule set we're designing for

To judge the model on more than the toy example, here is the working set of selection concerns we
*anticipate* features contributing, drawn from feature planning across the project.

**Treat it as illustrative, not a specification.** Most of these aren't implemented yet; several aren't
precisely defined; and some will likely become more than one rule once they are — `rendition-selection-caps`,
for one, is really an upper cap, a hard floor, and a soft floor, which behave differently (see
[the known weakness](#the-known-weakness-ranked-fallback)). The "kind" assigned to each is a
best-current-guess. The point isn't the exact roster — it's that the set is *varied and growing*, which
is what stresses the model.

Each concern is sketched as one of three kinds — a **constraint** (hard exclusion of the unplayable), a
**scope** (a soft filter: a preference we'd narrow to, and rebuffer to honor), or a **ranker** (a sort by
a runtime signal):

| Feature (anticipated) | Likely kind | Roughly what it wants |
|---|---|---|
| `capability-probing` | constraint | Exclude tracks the environment can't decode (codec/DRM). |
| `multi-cdn-failover` | constraint + scope | Exclude a failed CDN's tracks during cooldown; prefer the active CDN's tracks. |
| `content-steering` | scope | Prefer the active pathway's tracks. |
| `video-abr` / `audio-abr` | ranker | Of the fitting tracks, highest quality; over-throughput as fallback. |
| `multi-signal-abr` | ranker | Order by a fused quality/throughput signal. |
| `userVideoTrackSelection` / `userAudioTrackSelection` | scope | Honor an explicit user choice above all policy — usually of a track *feature* (a video resolution, an audio language), so it prefers every track matching that feature, not one specific track. (The names imply a single-track pick; that's an artifact of today's naive implementation.) |
| `multi-language-audio` | scope | Prefer the default/selected language. |
| `5.1-surround-selection` | scope | Prefer the requested channel layout. |
| `hevc-variant-selection` | scope | Prefer (or force) a codec, e.g. AVC over HEVC. |
| `rendition-selection-caps` | scope (likely several) | Stay within an upper cap (player/screen size, cost tier) and/or above a floor. |

This set is already long, and it will grow as features land. That breadth — not any single entry — is
the backdrop for the model.

## A shared example

A compact subset of those concerns, on one track set, used to watch the model work.

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
| 2 | `capabilityProbing` | constraint | Exclude unplayable tracks; no preference among the playable rest. |
| 3 | `abr` | ranker | Of the fitting tracks, highest quality; over-throughput tracks a fallback, least-over first. |

A pick depends on the playback **context** — one fact per rule:

- **Preferred language** — Spanish.
- **E-AC-3 decodable?** — yes.
- **Throughput estimate** — ~300 kbps, so `esLowEac` / `enLowAac` / `enHighAac` fit; the rest are over.

The correct pick is **`esLowEac`** — the user wants Spanish, and `esLowEac` is the only Spanish
rendition that fits. Note the trap: the best *fitting* track overall is `enHighAac` (256 > 192), so any
model that lets throughput quietly outrank language picks English here — wrong.

## How the model works on the example

**Constraints first.** `capabilityProbing` is the only constraint, and E-AC-3 decodes, so it removes
nothing. All six tracks survive to the rule chain.

**Then the chain, most authoritative first** — `preferredLanguage` (scope) ahead of `abr` (ranker, last):

```ts
let results = applyConstraints(tracks);  // → all six (everything is playable)

results = preferredLanguage(results);    // soft filter → Spanish
// → [esLowEac, esHighEac, esMaxEac]     English dropped; Spanish is non-empty so the narrow sticks
//                                        (3 left, not 1 → no early bail; keep going)

results = abr(results);                  // sort → fitting first, then least-over
// → [esLowEac, esHighEac, esMaxEac]     esLowEac (192, fits) ahead of the over-throughput two

pick = results[0] = esLowEac             // ✅  language narrowed the field; abr ordered within it
```

`preferredLanguage` removes English outright, so `abr` never gets the chance to float `enHighAac` to the
front — it only orders the Spanish tracks that survived. And the order of the two rules doesn't matter:
run `abr` first and it sorts all six, then `preferredLanguage` narrows to the Spanish three *keeping
abr's order among them* — same pick. A preference that **narrows** can't be overridden by a ranker the
way a preference expressed as a sort could be, which is the whole reason scopes are soft filters here and
not sorts.

## Both track types: the two chains

The shared example is small. The model has to carry the broader set above. Here is each track type's
arrangement, with the same illustrative-not-final caveat as the table — and the same caveat on chain
order from above: the most-authoritative-first sequence shown is a working starting point, not a fixed
ranking.

```
AUDIO → selectedAudioTrackId

CONSTRAINTS (hard, pooled, order-free):
  capability-probing (codec/DRM) · multi-cdn-failover (failed CDN, cooldown)

RULE CHAIN (most authoritative → least; abr last):
  user      userAudioTrackSelection   chosen language          ← most authoritative
  scope     multi-language-audio      default language
  scope     5.1-surround              requested channel layout (rebuffer to honor)
  scope     content-steering          active pathway           (reflects an upstream pick)   [shared]
  scope     multi-cdn-failover        active CDN                (reflects an upstream pick)   [shared]
  ranker    audio-abr                 fitting > over-throughput
```

```
VIDEO → selectedVideoTrackId

CONSTRAINTS (hard, pooled, order-free):
  capability-probing (codec/DRM) · multi-cdn-failover (failed CDN) · (future) dropped-frames

RULE CHAIN (most authoritative → least; abr last):
  user      userVideoTrackSelection   chosen resolution        ← most authoritative
  scope     hevc / force-AVC          preferred codec          (rebuffer to honor)
  scope     rendition cap (upper)     within cap               (lower tracks fit → never rebuffers)
  scope     rendition floor (hard)    ≥floor                   (rebuffer rather than show too-low)
  scope     content-steering          active pathway           (reflects an upstream pick)   [shared]
  scope     multi-cdn-failover        active CDN                (reflects an upstream pick)   [shared]
  ranker    video-abr / multi-signal-abr / (future) dropped-frames
  ── not placeable ──
  ✗ rendition floor (soft)            "prefer ≥Y but don't rebuffer" → ranked fallback (see below)
```

Two notes the chains depend on:

- **Pathway rules reflect an upstream pick.** A separate, session-level behavior owns *which* CDN/pathway
  is active (it identifies pathways, picks one, fails over). `content-steering` / `multi-cdn-failover`
  don't choose — they *reflect* that state: prefer the active pathway (a scope) and exclude a failed one
  (a constraint). Throughput shifts from a switch are read by `abr` downstream; the two never form a
  loop.
- **Cross-type consistency is a composition convention.** The audio and video rule sets include the
  *same* pathway rule definition, so both reflect the same upstream pick and stay on one pathway.
  Mis-wiring a different pathway rule per type is the only failure mode — a convention tolerates it.

Why these land cleanly as soft filters:

- An **upper cap** narrows to the within-cap tracks; the lower tracks always fit, so the pick never
  rebuffers — the cap runs *with* `abr`'s ceiling.
- A **hard floor** narrows to `≥floor`; if every `≥floor` track is over-throughput, `abr` picks the
  least-over and the player rebuffers — which is what a hard floor asks for.
- A **scope that rebuffers to honor** (preferred language, channel layout, codec) narrows to the wanted
  tracks; if all of them are over-throughput, you rebuffer to stay in scope. Correct, and it can't be
  mis-ordered into picking an over-throughput track it *didn't* want, because it removes rather than
  reorders.

The single row that doesn't fit is the `✗` line.

## The known weakness: ranked fallback

There is one shape this model can't express. Call it **ranked fallback**: a preference that has a first
choice *and* an ordered second choice for when the first choice isn't available — and whose second choice
still has to respect which tracks actually fit the current throughput. The model can *narrow* (keep or
drop a track) and it can *rank* (one ordering of what's left), but it has no way to say "prefer these,
ordered this way; failing that, fall back to those, ordered that way."

The clearest case is a **soft minimum-resolution floor**: "prefer ≥360p, but don't rebuffer for it." On a
240/360/480 ladder, the desired picks across falling throughput are `360, 360, 240` — take 360p while it
fits, drop to 240p rather than rebuffer once it doesn't.

- As a **soft filter** (`≥360p`): when only 240p fits, the `≥360p` tracks are all over-throughput, so
  `abr` picks an over-throughput one and the player rebuffers — exactly what we said not to do.
- As a **sort** placed before `abr`: it can float 360p ahead, but it can't *lift* 240p to 360p when only
  240p fits, so it does nothing useful in the case that matters.

The floor needs to sit *between* `abr`'s fits-vs-over decision and its bitrate ordering — rank the
fitting tracks one way, fall through to a *ranked* leftover another way — and neither a soft filter (keep
or drop) nor a single stable sort can straddle that. A verdict/tier-based model, where a rule can mark a
ranked preferred set *and* a ranked fallback set, expresses it natively; this model trades that
expressiveness for two simple rule kinds.

**We are choosing to bite this bullet.** A soft resolution floor is an ordinary product ask, not a
corner case, so this is a real (bounded) gap, not a hypothetical one. We are not solving it here — it
stands as a known limitation, and if it becomes load-bearing the escape hatch is the same one every
engine that fuses tier and ranking uses: split `abr` into a bitrate ordering and a fits-vs-over
threshold, and slot the floor between them by hand. That's a rewrite of an existing rule, which is why
it's a weakness and not a free extension — but it's a localized one, and it buys back the two-primitive
simplicity everywhere else.

## Why this model

The recommendation is this Filter + Sort variation — constraints as a hard pre-pass, preferences as soft
filters, one ranker, one ordered chain — over a richer per-track verdict model, on these grounds:

- **Two rule kinds, plainly composed.** A constraint excludes the unplayable; a rule narrows or ranks.
  There is no verdict algebra to define or get right; the composer drops the constraints' exclusions,
  then runs the chain.
- **Preferences narrow, so order is mostly free.** Because a scope removes rather than competes in a sort
  key, it can't be mis-ordered into an unsafe or wrong pick against the ranker — the language-vs-abr trap
  that a pure sort chain has simply doesn't arise. Order matters only among soft filters that genuinely
  conflict (resolved most-authoritative-first) and between two rankers that disagree.
- **Safety is structural.** Playability is decided once, up front, by the constraints pass, independent
  of any preference or its ordering. A surviving track is playable by construction.
- **Early-bail is natural.** Narrowing to one track ends the chain before the throughput estimate runs.
- **The cost is one named gap** — ranked fallback (the soft floor) — accepted with eyes open, with a
  localized escape hatch if it ever has to be closed.

The trade is deliberate. The main alternative considered was a richer model in which each rule emits a
per-track verdict (a track is preferred, merely allowed, or excluded) and a composer combines those
verdicts by category. That model expresses ranked fallback natively and shaves the residual
order-sensitivity, so it would make *some* rule compositions solvable that this one can't — the soft
floor among them. But it's a narrow set: it doesn't unlock *most* compositions (the two models reach the
same pick on essentially every rule we anticipate), and it pays for that headroom with a more
complicated rule shape *and* a more complicated composition engine to combine the verdicts. For the rule
set we anticipate, the simpler two-kind model covers everything but the one shape above, covers it more
robustly under author error, and keeps both the rules and the engine that combines them small. Status
stays `draft` pending that call.

## Fitting the model to the track-switching behavior

This is a sketch of how the model lands in the running engine, grounded in the track-switching behavior
as it stands today — *not* a settled wiring. Like the chain-order heuristic above, expect it to firm up
as the rule set does.

The behavior already runs a miniature of this model. While a presentation is resolved, it reacts: it
takes the tracks of its type, narrows them by a single user-selection preference (falling back to all of
them if that preference matches nothing), and — if the narrowing leaves exactly one track — sets that as
the pick and stops, *without ever reading the bandwidth estimate*; otherwise it runs the bandwidth-driven
ranker. That is one soft filter, the early-bail, and one ranker, hardcoded. The model generalizes it in
two places: it adds the constraints pass, and it replaces the single fixed filter-then-rank with the
open-ended chain. Rules, like the behavior's existing picker and tuning, arrive by configuration — a
feature contributes its rule without reopening the behavior.

Three things the model implies about where each piece lives:

- **Constraints gate; rules run in the reaction.** Constraints are a derived value computed *outside* the
  reaction — they answer "what's playable here at all," the same kind of question that already decides
  whether the behavior is in its selecting state. So they feed the gate: while the playable set is still
  unknown the behavior isn't ready to select; once it's known, the behavior enters its selecting state and
  hands the pruned set in as the candidate list. The rules, by contrast, run *inside* the reaction, over
  those candidates.

- **An empty playable set is its own outcome.** A non-empty playable set is the candidate list; the
  still-unknown case gates as above. The case worth calling out — and still open — is when constraints
  leave *nothing* playable. That is not a fall-back-to-everything (that's the *soft* filter's job;
  constraints are hard): "nothing decodable here" is a terminal condition the engine surfaces, a distinct
  not-ready state rather than a pick. Exactly how that state is modeled is open.

- **Rules are reactive, and early-bail prunes what they react to.** Almost every rule reads more than the
  track list — a ranker reads the throughput estimate, a pathway scope reads which CDN is active. Those
  reads happen inside the reaction, so the reaction subscribes to exactly the signals the rules consulted
  and re-runs when any of them change. This is why early-bail is more than skipping the throughput
  estimate once: a rule that narrows the field to a single track ends the chain *before* later rules read
  their signals at all, so the reaction never subscribes to them and never re-fires on their changes while
  that narrowing holds. The behavior already does exactly this by hand for the bandwidth estimate; the
  chain makes it the general rule.

- **How a rule expresses its signal dependencies is an open contract question.** Because a rule reads more
  than the track list, it has to surface *which* state and context signals it consults so the reaction can
  subscribe to them — and because the behavior declares its dependencies up front while rules arrive by
  configuration, how a rule's dependencies reach that declaration isn't settled. Some coarse options, not
  yet chosen:

  - **Declared, like a behavior** — a rule is an object (or a type) that names the signals it requires, or
    might use, the way a behavior declares its own; composition aggregates those into the behavior's
    declared set. Most explicit, composes cleanly, most up-front machinery.
  - **Tightly coupled reads** *(the likely starting point)* — the rule handed in via configuration is a
    small closure that reads its signals directly, and the behavior's declared set is just what those rules
    read. The selection logic itself can still live decoupled in the media layer as a plain function tied
    to no signals; only the thin rule wrapper that does the reading is coupled. Simplest to start; defers
    the general contract.
  - **A prebuilt selection context** — the behavior reads a fixed surface of signals once per run and hands
    each rule a plain context value, so rules stay pure and never touch signals. Keeps the behavior's
    declaration static, but bounds a rule to whatever that fixed surface carries.

  This also interacts with early-bail, which wants per-run lazy reads in chain order rather than an
  up-front union of every rule's signals. Out of scope here; noted because it likely shapes the eventual
  rule contract.

## Appendix A: prior art

Every major HTTP-adaptive-streaming engine separates **hard constraints (a pruning pass) from soft
ranking**, and none combines decision sources by weighted-sum scoring. That universal split is what
grounds the two-phase shape here — constraints then rules is the form the whole field converged on.

| Engine | Hard exclusion | Soft combination policy | Criteria are… |
|---|---|---|---|
| [**Shaka**](https://github.com/shaka-project/shaka-player) | `getPlayableVariants()` gate (`filterManifest` + `applyRestrictions`); two typed errors | preference narrows the set, then a *single* bandwidth ranker (`SimpleAbrManager`) | a fixed pipeline |
| [**hls.js**](https://github.com/video-dev/hls.js) | codec-unsupported levels removed from the manifest | one ABR ranker + min/max **index clamping** (cap-level, HDCP, min-bitrate each write a clamp) | hardcoded controllers |
| [**VHS**](https://github.com/videojs/http-streaming) | `excludeUntil === Infinity` (`isIncompatible` / `isEnabled`) | bandwidth + resolution sort with a fallback chain | one selector function |
| [**dash.js**](https://github.com/Dash-Industry-Forum/dash.js) | `_filterByPossibleBitrate` / `_filterByPortalSize`; `CapabilitiesFilter` | rules collection → `getMinSwitchRequest`: most-cautious pick within a priority tier (STRONG / DEFAULT / WEAK) | a fixed rule list |
| [**rx-player**](https://github.com/canalplus/rx-player) | `isRepresentationPlayable` (decipherable + codec); representation locking narrows to an ID set | soft throttle / resolution limits (with fallback), then a fixed precedence cascade of bandwidth / buffer / guess estimators | a hardcoded selector |
| [**OSMF**](https://sourceforge.net/adobe/osmf/svn/HEAD/tree/) | `maxAllowedIndex` applied after the rules | `SwitchingRules` → manager takes the most conservative recommended index (`-1` = no opinion) | a fixed rule list |
| [**media3 / ExoPlayer**](https://github.com/androidx/media) | `SELECTION_ELIGIBILITY_NO` (capability, or constraints when relax is off) | multi-key comparison (`ComparisonChain`) — each key breaks ties left by the one before; soft constraints fall back gracefully (`exceedConstraintsIfNecessary`) | a hardcoded comparator |
| [**VLC**](https://github.com/videolan/vlc) | `RepresentationSelector` resolution / bitrate bounds (shared filter pass, fallback-to-lowest) | a single `AbstractAdaptationLogic` chosen up front by config (`adaptive-logic`) — not composed | a swappable whole-algorithm strategy |

Four things this tells us:

1. **The hard/soft split is universal**, not our invention — it *is* the constraints-then-rules shape
   here. A hard exclusion before any ranking is the declarative form of what every engine encodes
   imperatively as "survived the pruning pass."

2. **No one adds up the criteria into a single score.** dash.js and OSMF take the most cautious
   recommendation across rules within a priority tier; ExoPlayer ranks on one criterion and uses the next
   only to break ties; rx-player consults its estimators in a fixed order of precedence. A
   "give every track a number and add the criteria up" approach has no precedent and would mix things
   that can't share one scale — a language preference and a throughput estimate aren't measured in the
   same units.

3. **This model's shape is battle-tested.** A pruning pass plus a chain that narrows then ranks, with a
   soft preference that falls back gracefully when it would leave nothing, is essentially ExoPlayer's
   `ComparisonChain` with `exceedConstraintsIfNecessary`, rx-player's narrowing-with-fallback cascade, and
   Shaka's filter-then-rank. The ranked-fallback shape we're giving up is the one dash.js / OSMF get from
   their priority tiers — which is the alternative we're deliberately not adopting.

4. **What none of them have is per-rule composability.** Every engine's combination logic is a *central,
   hardcoded* function — ExoPlayer's comparator, dash.js's `getMinSwitchRequest`, OSMF's `checkRules`,
   rx-player's `getCurrentEstimate`, hls.js's clamps. VLC is the only pluggable one, but at the
   whole-algorithm level, which can't express a concern that must *stack* with ABR rather than replace it
   (multi-CDN failover isn't "a different ABR algorithm"). That's fine for a player with a fixed feature
   set; SPF is a composition framework where features arrive *by composition*, so the combination policy
   has to be expressible as independent, feature-owned rules. The engines establish that the underlying
   policy is sound; the per-rule composition is what this model adds on top.

*Scope: surveyed independent JS engines, native mobile (media3), native desktop (VLC), and the Flash-era
ancestor (OSMF). Excluded UI wrappers (Vidstack, Plyr, Media Chrome, Mux Player) — they delegate
selection to one of these — and native black boxes (AVPlayer / Apple HLS) that aren't inspectable.*
