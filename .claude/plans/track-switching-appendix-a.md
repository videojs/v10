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

## Option 1 — `filter` means "forbidden-or-not-preferred"

Here a rule is a plain **keep/drop filter** — it returns the tracks it keeps, recording *what*
survived but not *why* each other track was dropped. So it can't tell "do not play"
(`capabilityProbing` dropping an undecodable track) from "prefer not to play" (`preferredLanguage`
passing over English). When those dropped sets overlap, the filter must either fail on playable
content or play unplayable content.

Assume **E-AC-3 is not decodable**, so `capabilityProbing` drops all three Spanish renditions.

### A plain filter — keep/drop only

Each rule in isolation returns what it keeps; the "why" lives only in the comments, not the data:

```ts
preferredLanguage(tracks)  // → [esLowEac, esHighEac, esMaxEac]   drop English (user prefers Spanish)
capabilityProbing(tracks)  // → [enLowAac, enHighAac, enMaxAac]   drop the E-AC-3 tracks (here, all the Spanish ones)
abr(tracks)                // → [enHighAac, esLowEac, enLowAac]   drop the over-throughput tracks; sort the rest
```

Composing = chain the filters, each narrowing what's left:

```ts
let results = tracks;
results = preferredLanguage(results);  // → [esLowEac, esHighEac, esMaxEac]   drops English
results = capabilityProbing(results);  // → []                                drops Spanish (undecodable)
results = abr(results);                // → []                                nothing left

// results is empty. English was dropped back at preferredLanguage, with no record it was only
// "prefer not to play" (safe to relax) while Spanish was "do not play" — so we can't recover:
//   • give up   → "no playable audio"           ❌  (English was fine)
//   • undo all  → may play undecodable Spanish   ❌  (decode error)
```

### The structured output — the reason survives

Keep the *why*: `forbidden` ("do not play") is distinct from merely-not-`preferred` ("prefer not to play").

```ts
preferredLanguage  // { preferred: [esLowEac, esHighEac, esMaxEac] }    Spanish preferred; English just not-preferred
capabilityProbing  // { forbidden: [esLowEac, esHighEac, esMaxEac] }    "do not play" — undecodable
abr                // { preferred: [enHighAac, esLowEac, enLowAac], allowed: [esHighEac, enMaxAac, esMaxEac] }

forbidden = [esLowEac, esHighEac, esMaxEac]   // do not play (union of every forbidden set)
eligible  = [enLowAac, enHighAac, enMaxAac]   // English survives — not forbidden, just not-preferred
pick      = enHighAac                         // ✅ Spanish undecodable → abr's best fitting English
```

**Takeaway:** the plain filter keeps only *what* survived and discards *why each track didn't*, so an
empty result can't relax "prefer not to play" (English → recover) while still respecting "do not
play" (Spanish). Recording the reason — `forbidden` vs merely-not-`preferred` — is what lets
composition fall back to English instead of failing or playing something undecodable.

## Option 2 — `filter` means "forbidden"; preferred-vs-allowed via sort

Option 1's fix: make `filter` *always* mean `forbidden` (hard), and put the softer
preferred-vs-allowed distinction in **sort order** — each rule sorts the tracks it doesn't forbid,
front = preferred, back = merely tolerated. Assume **E-AC-3 is decodable**, so `capabilityProbing`
forbids nothing and all six renditions are playable.

The two opinionated rules now disagree about order: `preferredLanguage` wants every Spanish rendition
ahead of every English one; `abr` wants `enHighAac` (its best fitting rendition) ahead of `esLowEac`
— because the only fitting Spanish rendition, `esLowEac` (192), is lower-bitrate than the best
fitting English, `enHighAac` (256). Both are right, about *different axes*. The correct pick is
`esLowEac` (Spanish and fitting).

### A filter + sort — tier via sort position

Each rule sorts what it tolerates; "preferred" is just "nearer the front":

```ts
preferredLanguage(tracks)  // sorts → [esLowEac, esHighEac, esMaxEac, enLowAac, enHighAac, enMaxAac]   Spanish first; bitrate order arbitrary
capabilityProbing(tracks)  // keeps → all six (forbids nothing; no sort opinion)
abr(tracks)                // sorts → [enHighAac, esLowEac, enLowAac, esHighEac, enMaxAac, esMaxEac]   fitting best-first, then over-throughput
```

Composing = chain the sorts, each re-sorting the running list — and because a sort returns a *total*
order, the last rule's sort wins outright:

```ts
let results = tracks;
results = preferredLanguage(results);  // → [esLowEac, esHighEac, esMaxEac, enLowAac, enHighAac, enMaxAac]   Spanish to front; bitrate order arbitrary
results = capabilityProbing(results);  // → unchanged   forbids nothing
results = abr(results);                // → [enHighAac, esLowEac, enLowAac, esHighEac, enMaxAac, esMaxEac]   re-sorts by fit → enHighAac to front

// pick = results[0] = enHighAac ❌ — abr sorted last and clobbered preferredLanguage's "Spanish first",
// so the user asked for Spanish and got English. The Spanish ladder doesn't save it — the best FITTING
// track is still English (enHighAac 256 > esLowEac 192). But abr only won because it sorted *last*…
```

#### But can't we just reorder the rules?

`abr` only "won" because it sorted **last** — and chaining sorts is last-writer-wins, so the
last-applied rule is effectively the *primary* sort key. We applied the rules in priority order, which
puts our highest-priority rule (`preferredLanguage`) *first* — the weakest spot. That's backwards. Flip
it so `preferredLanguage` sorts last:

```ts
let results = tracks;
results = abr(results);                // → [enHighAac, esLowEac, enLowAac, esHighEac, enMaxAac, esMaxEac]   quality order
results = capabilityProbing(results);  // → unchanged   forbids nothing
results = preferredLanguage(results);  // → [esLowEac, esHighEac, esMaxEac, enHighAac, enLowAac, enMaxAac]   Spanish to front

pick = results[0] = esLowEac   // ✅ Spanish and fitting — the cross-language switch is gone
```

`preferredLanguage` only reorders by language — a **stable** sort — so it floats Spanish to the front
*without disturbing* `abr`'s order within each language. Chaining the two stable sorts is just a
lexicographic sort: **language primary, `abr` quality secondary**. For this example it genuinely works
— `esLowEac` is picked, and `abr`'s ranking survives as the within-language tiebreaker.

So is filter + sort fine after all, as long as we order the rules right? For this scenario, yes. The
strict, global priority that chaining stable sorts imposes — whatever sorts last wins unconditionally —
is exactly what we want here: language *always* outranks throughput, so every Spanish rendition,
including the over-throughput `esHighEac` and `esMaxEac`, sits above every English one. That's correct.
The user asked for Spanish, so we play Spanish — rebuffering if we must — and only drop to English once
no Spanish rendition is left.

### The structured output — the tiers survive

A rule emits `preferred` (and `forbidden` where it applies); its leftover is the implicit, unsorted
`allowed`. A rule spells `allowed` out explicitly only when it ranks that leftover, as `abr` does for
its over-throughput tracks. The composer keeps the **tier** (pessimistic) separate from the **order**
(from the rules' rankings):

```ts
preferredLanguage  // { preferred: [esLowEac, esHighEac, esMaxEac] }              → English implicitly allowed (no bitrate ranking)
capabilityProbing  // { }                                                          → forbids nothing; no preference, transparent to tiering
abr                // { preferred: [enHighAac, esLowEac, enLowAac], preferredRanked: true,
                   //   allowed: [esHighEac, enMaxAac, esMaxEac] }                 → over-throughput tier, ranked ascending

// composite TIER — pessimistic (preferred only if every rule that voices a preference prefers it):
//   esLowEac             → preferred   (preferredLanguage ✓ and abr ✓; capabilityProbing voices none)
//   enHighAac, enLowAac  → allowed     (abr prefers them, but preferredLanguage only allows English)
//   esHighEac, esMaxEac  → allowed     (preferredLanguage prefers them, but abr only allows over-throughput)
//   enMaxAac             → allowed     (both rules only allow it)
preferred = [esLowEac]
allowed   = [enHighAac, enLowAac, esHighEac, enMaxAac, esMaxEac]   // ORDER from abr: fitting (enHighAac>enLowAac), then over-throughput

pick = first preferred → esLowEac   // ✅ Spanish & fitting — the one rendition both rules prefer
```

`preferredLanguage`'s silence on English is what demotes it: a track is composite-`preferred` only if
*every* rule that voices a preference prefers it — so `enHighAac` is demoted (abr prefers it,
`preferredLanguage` only allows English), and `esHighEac`/`esMaxEac` are demoted too
(`preferredLanguage` prefers them, abr only allows the over-throughput rungs). Only `esLowEac` —
Spanish *and* fitting — is preferred by both, so it's the pick. The cross-language switch never
happens: `esLowEac` beats `enHighAac` by **tier**, even though abr ranks `enHighAac` higher by
**order**.

In the `allowed` fallback the over-throughput Spanish (`esHighEac`, `esMaxEac`) appears demoted below
fitting English — seemingly a switch to English rather than a rebuffer. But the fall-through still
favors the language: with no Spanish rung fitting, it takes an over-throughput Spanish over English.
Spanish wins whether or not one of its rungs fits.

**Takeaway:** making `filter` mean only `forbidden` fixes Option 1's hard/soft conflation, but a
single sort position still can't carry preferred-vs-allowed. The two opinionated rules' tier-cuts
(language's Spanish-≫-English, abr's fitting-≫-over-throughput) fall in different places, and a flat
order holds only one. Worse, a sort forces every rule to *totally order* even tracks it has no opinion
on, so chaining is last-writer-wins — either abr clobbers the language scope (picks English) or
`preferredLanguage`'s phantom bitrate order clobbers abr's ranking. The structured model sidesteps
both: `allowed` is the implicit, unsorted leftover (or spelled out when a rule ranks it), the **tier**
composes pessimistically, and the **order** comes from the rules' rankings — so language scopes the
tier while abr ranks within it.

## Pressure test: can a reordered filter + sort actually cover every rule?

This complicates the Takeaway above. The reorder sub-section showed that, with **stable** sorts in the
right order, a plain filter + sort produces the correct pick for the language example — the "phantom
order clobbers abr" failure only happens with the *wrong* order (abr last). So: does the *same* model
cover **all** the rules in the design doc's Audit, not just the one example? **Tentative verdict: yes
for the in-scope rules — with one carve-out (the "Kind B" straddle, below) that turns out to be more
ordinary than a corner case.** So filter + sort (done right) is a legitimate alternative to the
categorical `{ preferred, allowed, forbidden }` model — not the strawman Appendix A set it up to be —
but the carve-out is a real factor in choosing between them.

### The model

- A **hard filter** removes tracks permanently (a `forbidden` union, applied before sorting).
- Every other rule is a **stable sort**.
- Sorts chain in priority order; chaining stable sorts is **last-writer-wins**, so the rule applied
  **last** is the primary key (the winner) and the rule applied **first** is the weakest tiebreaker.
- The pick is the head of the final list.

### Two litmus tests

**May it be a hard filter?** Only if it's "can't play in this environment" — *un-playable*, not
*un-preferred-by-policy*. Test: *if this exclusion emptied the set, is failing the right outcome?* Only
`capability-probing` and `multi-cdn-failover` (the failed-CDN-during-cooldown part) pass. Everything
the Audit marked "hard" by policy (`caps`-hard, `userX`-hard, `force-AVC`) fails — those exclude
*playable* tracks, so they're sorts that rank the disfavored last and always fall back.

**Where does a sort go in the order?** *Would we play an over-throughput (rebuffering) track to honor
it?* Yes → applied after ABR (it beats ABR). No → applied before ABR (ABR overrides it; it only breaks
ties among already-fitting tracks).

### The two chains

Each chain is in application order (first = weakest, last = winner). Tiers: **1** playback-quality
base, **2** system policy (beats ABR), **3** explicit user selection (winner).

```
AUDIO chain → selectedAudioTrackId

FILTERS:  capability-probing (audio codec/DRM) · multi-cdn-failover (failed)
SORT (first/weakest → last/winner):
  T1  audio-abr                   fitting > over-throughput
  T2  5.1-surround                prefer stereo / 5.1  (user/system channel preference — scope; rebuffer to honor, abr ranks within)
  T2  content-steering            top pathway                                   [shared] ⚠️
  T2  multi-cdn-failover (active) active CDN first                              [shared] ⚠️
  T2  multi-language-audio        default language
  T3  userAudioTrackSelection     chosen language        ← winner
```

```
VIDEO chain → selectedVideoTrackId

FILTERS:  capability-probing (video codec/DRM) · multi-cdn-failover (failed)
          · (future) dropped-frames filter
SORT (first/weakest → last/winner):
  T1  video-abr                   fitting > over-throughput
  T1  multi-signal-abr            fusion score
  T1  (future) dropped-frames     smoothest first
  T2  hevc / force-AVC            prefer AVC  (codec scope — rebuffer to honor; abr ranks within)
  T2  rendition cap (upper)       within-cap first  (player/screen size, cost tiers — clean)
  T2  rendition floor (lower,hard) ≥floor first      (Kind A scope — rebuffer rather than show too-low)
  T2  content-steering            top pathway                                   [shared] ⚠️
  T2  multi-cdn-failover (active) active CDN first                              [shared] ⚠️
  T3  userVideoTrackSelection     chosen rendition       ← winner
   ── not placeable in the chain ──
   ✗  rendition floor (lower,soft) "prefer ≥Y but don't rebuffer" under a data-saver baseline → Kind B
```

**`rendition-selection-caps` is a family** — and only part of it fits the chain cleanly:

- **Upper cap** — don't exceed X (player size, screen-size detection, cost/delivery tiers like avoiding
  1080p/4k). Clean: sorts after ABR as "within-cap first." It runs *with* ABR's own ceiling — above-cap
  renditions are higher-bitrate, so honoring the cap never forces a rebuffer.
- **Lower floor, hard** — "rebuffer rather than ever show below Y." A **Kind A scope** (prefer ≥Y,
  rebuffer to honor); sorts after ABR like any scope.
- **Lower floor, soft** — "prefer ≥Y, but don't rebuffer for it," under a data-saver / lowest-adequate
  baseline. **Kind B → non-goal** (the resolution-floor straddle below): it must push the pick *up
  within the fitting set* yet yield to throughput — straddling ABR's tier and ranking — so the chain
  can't place it.

### Non-goal: "prefer-among-fitting, don't-rebuffer" preferences (the straddle)

This model deliberately does **not** handle a preference that must **reorder *within* the fitting set,
against the baseline ranking** yet **must not rebuffer** to honor it. Optimal handling needs the rule
to sit *between* ABR's fitting/over **tier** and its **ranking** — and since ABR is a single sort key,
it can't be straddled. The canonical case — a quality **floor** under a baseline that pulls *lower*:

- **Resolution floor under a data-saver baseline.** A small/thumbnail player picks the *lowest adequate*
  rendition to save bandwidth, but not *too* low — "prefer ≥360p, but don't rebuffer for it." Ladder
  240p / 360p / 480p, desired picks across throughput = `360p, 360p, 240p`. The floor must push
  240p→360p *among the fitting tracks* (beat the lowest-first ranking) **and** drop to 240p when only
  240p fits (yield to the tier). No single floor position does both: *after* ABR it rebuffers when only
  240p fits; *before* ABR it can't override the baseline's 240p when 360p fits.

The shape generalizes to any "prefer the *higher-bandwidth* option among the fitting set, but don't
rebuffer for it, against a baseline that prefers lower" — e.g. `prefer 5.1` under a stereo-default /
data-saver baseline. (Note: a channel-layout *preference* — "prefer stereo/5.1" as user/system intent —
is **not** this; it's a scope that rebuffers to honor, so it lands cleanly after ABR. And "prefer the
*lower*-bandwidth option" never rebuffers, so it's clean too. Only "prefer higher, don't rebuffer,
against a lower-pulling baseline" straddles.)

What *avoids* the straddle: a **scope** ("rebuffer to honor it") sorts cleanly after ABR because it's
allowed to breach the tier; and a bound that runs *with* the baseline (an upper cap, or a floor when
the baseline already maximizes) is clean or redundant. The straddle appears precisely when a rule must
fight the baseline's ranking *and* respect the tier at the same time.

This is the one capability the categorical `{preferred, allowed}` model has that the chain doesn't: its
tier is composed pessimistically and kept *separate* from the within-tier order, so it expresses these
cases natively. And it is **not a rare corner** — "don't drop below 360p, but don't rebuffer for it" is
an ordinary product ask — so it's a real factor in the categorical-vs-lexicographic decision, not a
negligible gap.

### Still open (the review-and-iterate part)

- **This rebuts the Takeaway above.** A reordered, stable filter + sort *does* carry
  preferred-vs-allowed for these rules. Appendix A's "filter + sort isn't enough" needs reframing — the
  live question is categorical-vs-lexicographic **ergonomics/extensibility**, not capability.
- **`content-steering` / `multi-cdn` (active) vs ABR** (⚠️ above): parked in Tier 2 (rebuffer on the
  chosen pathway) — real argument for Tier 1 (switch pathway to avoid rebuffering). Policy call.
- **Pathway is likely a session-level decision** shared by both chains, not an independent per-chain
  sort (else audio and video could pick different CDNs).
- **A single multi-criteria user rule** (`{language, height}`) can't straddle ABR within one rule
  (language above, height below) — needs splitting into separate rules. The categorical model has the
  same limitation.
- **Apparent equivalence, minus Kind B:** on every *in-scope* documented rule, this order seems to
  produce the same pick as the categorical cascade (pessimistic tier + precedence + user-intent
  fall-through bias). The one thing the categorical model expresses that this can't is the Kind-B
  straddle above — which now looks common enough (ordinary quality-floor / stereo-output asks) that
  it's **not purely ergonomics**: there's a real, if bounded, correctness gap the categorical model
  closes.

<!-- NEXT: settle the steering/CDN policy call + session-level pathway; then decide categorical-vs-lexicographic and fold the resolved story into the design doc as Appendix A. -->



