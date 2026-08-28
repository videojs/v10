---
status: draft
date: 2026-08-28
definition: sketched
---

# DRM license & certificate transforms

How a consumer decorates or replaces the network exchanges DRM performs — the
**license** request/response and the **app-certificate** request/response —
without forking the engine. Provider-neutral `<hls-video>` is public API at
VJSv10 GA, so the extension shape freezes now; this record fixes it so every
later provider is an additive data point, not a contract change.

Part of [drm-support](./drm-support.md) — the "license-fetcher composability"
line item, whose concrete need is GA of the provider-neutral element.

## The shape: per-key-system transform slots, on the objects that already exist

The transforms that need *functions* are key-system-specific — SPC shaping, CKC
unwrapping, PlayReady envelope handling are properties of a system's wire
protocol, not the deployment. (Cross-cutting, deployment-wide needs are almost
all *data* — auth headers — already covered by `source.drm[ks].headers` as a
resolver.) So the slots are per key system, and they live on the two
per-key-system objects SPF already has — **no new container, no global filter
list, no `keySystem` branching**:

```ts
// Four transform slots, request and response over license and certificate.
type DrmRequestTransform  = (req: DrmRequest) => DrmRequest | Promise<DrmRequest>;
type DrmResponseTransform = (res: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer> | Promise<Uint8Array<ArrayBuffer>>;
interface DrmRequest { url: string; headers: Record<string, string>; body: BufferSource | null; }

// Home 1 — KeySystemModule (media/drm.ts): the SHIPPED DEFAULT per system,
// engine-composed. `shapeLicenseRequest` is renamed `licenseRequest` and
// widened to the DrmRequest shape; three siblings join it.
interface KeySystemModule {
  /* …keySystem, keyFormats, requestVariants, initDataTypes, toInitData… */
  readonly licenseRequest?:      DrmRequestTransform;    // was shapeLicenseRequest
  readonly licenseResponse?:     DrmResponseTransform;
  readonly certificateRequest?:  DrmRequestTransform;
  readonly certificateResponse?: DrmResponseTransform;
}

// Home 2 — DrmSystemConfig (spf/media/drm.ts): the per-source OVERRIDE, on
// source.drm[keySystem], right beside licenseUrl. Same four slots, optional.
interface DrmSystemConfig {
  licenseUrl: DrmUrl;
  serverCertificateUrl?: DrmUrl;
  headers?: DrmHeaders;
  licenseRequest?:      DrmRequestTransform;
  licenseResponse?:     DrmResponseTransform;
  certificateRequest?:  DrmRequestTransform;
  certificateResponse?: DrmResponseTransform;
}
```

Read: `source.drm['com.apple.fps'].licenseResponse = detectFairPlayCkc`, sitting
next to `.licenseUrl`. Resolution per slot per system, at each fetch:
**`source.drm[ks][slot]` ?? `keySystemModule[slot]` (default) ?? identity.**

## Why this placement is safe, and where the boundary is

`DrmSystemConfig` here is **SPF's own local type** (`spf/media/drm.ts`), not the
shared `@videojs/media` `DrmSystemConfig`. It already carries functions —
`licenseUrl` is a `DrmUrl` resolver — safely, because the SPF Media builds its
engine **once** (`adapters/hls-video/adapter.ts:227`) and its source setter only
re-points `#source` + updates the `src` signal; it never `deepEqual`s the source
or rebuilds. Adding transform functions beside `licenseUrl` is consistent with
what's already there.

The boundary, stated so it isn't crossed later: these transforms are
**SPF-engine-local and deliberately not on the shared `@videojs/media`
contract.** Function values there would reintroduce the hls.js/Shaka
`deepEqual` engine-rebuild (`#engineConfigKey` compares `drm` structurally) — the
same reason `headers` was kept plain-data for promotability. Cross-engine, each
engine keeps its own hook surface: hls.js `drmSystems[ks].generateRequest` +
`licenseXhrSetup`, Shaka `advanced[ks]` + request/response filters. Prior art:
all four engines are per-key-system for request shaping; only hls.js's *global*
`licenseXhrSetup`/`licenseResponseCallback` force `keySystem` branching, which
per-system slots avoid.

## Application (one place each, thin by design)

- **License**, in `exchange-licenses`: build `DrmRequest` from `source.drm[ks]`
  (URL + headers) → resolve+run `licenseRequest` → `fetchLicense` → resolve+run
  `licenseResponse` → `session.update`.
- **Certificate**, in `setup-media-keys`: build `DrmRequest` (body `null`) →
  `certificateRequest` → `fetchServerCertificate` (which gains headers for the
  first time) → `certificateResponse` → `setServerCertificate`.

Two wrapper steps around the existing fetches plus config threading — not a
framework. When network concerns move into their own sub-architecture,
`DrmRequest` + these transforms become one typed instance of that layer's
request pipeline, and this record is superseded rather than unwound.

## Decisions (resolved)

1. **Return-new, not mutate.** Transforms return the next value; immutable, and
   consistent with today's `shapeLicenseRequest` (which already returns).
2. **Async.** `=> T | Promise<T>` — per-session token minting is real.
3. **No auto-detect default.** Default slot is identity (raw), preserving the
   Mux/EZDRM green path. Unwrap logic ships as **exported, tree-shakable helpers**
   from `@videojs/spf` media (`detectFairPlayCkc`, `unwrapJsonLicense`, …) that a
   consumer, a test, or a reference example drops into a slot — weight only if
   imported. Shaka's library-of-named-functions model.
4. **No full-override / cross-cutting hook now.** A "own the whole round-trip"
   hook (rx-player `getLicense`) and any deployment-wide network hook are
   additive later (new optional field breaks nothing); cross-cutting network
   concerns belong to the future network sub-architecture, not here.
5. **On the source, per system.** `source.drm[keySystem]` (SPF's local type),
   not a separate container and not the shared contract. The hls.js Media is the
   reference: functions live with the engine-specific config, data stays on the
   shared `drm` shape.

## Out of scope of this record

- **`keystatuschange` policy** (expiry/HDCP → error|continue|fallback) —
  rx-player's declarative enums; a sibling extension point, its own record.
- **Init-data transform / FairPlay content-id over MSE** — the Axinom analysis
  proved it can't rescue that case (session binding); tracked in drm-support.

## TDD plan

1. **Rename + widen:** `KeySystemModule.shapeLicenseRequest` → `licenseRequest`,
   signature `(message) => {body,headers}` → `(req: DrmRequest) => DrmRequest`.
   Update PlayReady's default + the `exchange-licenses` call site + tests; suite
   stays green (pure refactor, Mux/EZDRM/PlayReady unchanged).
2. **Default slots:** add `licenseResponse`/`certificateRequest`/
   `certificateResponse` to `KeySystemModule`; identity when unset.
3. **Override slots:** add the four to SPF `DrmSystemConfig`; resolution is
   `source ?? module ?? identity` — unit-test the precedence per slot.
4. **Apply — response:** `licenseResponse` runs before `session.update`
   (exchange-licenses); pin unwrap-before-update.
5. **Apply — certificate:** `certificateRequest`/`certificateResponse` +
   `fetchServerCertificate` gaining headers (setup-media-keys); pin headers reach
   the cert fetch.
6. **Helpers:** `detectFairPlayCkc` (raw/base64/`<ckc>`XML/JSON → raw) and
   `unwrapJsonLicense`, exported + unit-tested against Shaka's known shapes.
7. **Composition invariant:** the new config still materializes only in DRM
   engine variants — droppability test unchanged.
