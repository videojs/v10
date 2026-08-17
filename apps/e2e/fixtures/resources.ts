/** Media sources for e2e tests. */
export const MEDIA = {
  mp4: {
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
    poster: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg',
    storyboard: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/storyboard.vtt',
  },
  /** HLS with TS segments (Big Buck Bunny via Mux). */
  hlsTs: {
    url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
    poster: 'https://image.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA/thumbnail.jpg',
    storyboard: 'https://image.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA/storyboard.vtt',
  },
  /** HLS with fMP4/CMAF segments (Dancing Dude via Mux). */
  hlsFmp4: {
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8',
    poster: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg',
    storyboard: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/storyboard.vtt',
  },
  /**
   * HLS/CMAF with a 4K ladder — rungs from 640x360 up to 3838x2160, so a screen
   * emulated below the top rung has something smaller to cap to. Video-only.
   *
   * The off-by-two widths are the source's near-square pixel aspect ratio rather
   * than a typo, which is why the cap compares pixel areas instead of matching
   * `1920x1080`-style tiers.
   */
  hls4k: {
    url: 'https://stream.mux.com/SfAaZ9InpM8FMfky7DkNBuTpxEDqU8Jchpa49urOWcs.m3u8',
  },
  /**
   * HLS/CMAF carrying **no video renditions at all** — the one failure shape with
   * no per-rendition cause behind it, since nothing resolves and so nothing
   * reports. A video-only composition can never play it.
   */
  hlsAudioOnly: {
    url: 'https://stream.mux.com/2NEjLyf6ETnskbfAtbM00Vdzb97B00OKUUQcRD6LZpBRw.m3u8',
  },
  /**
   * DRM-protected HLS, deliberately left unlicensed: the video renditions carry
   * `EXT-X-KEY` for all three key systems and no license path is supplied, so an
   * engine with no EME pipeline reports the source as protected. Here to be
   * refused, not played.
   *
   * The playback token is signed to `exp: 2147483647` (January 2038), so this
   * doesn't rot out from under CI. Same asset the sandbox offers as
   * `hls-drm-unlicensed`.
   */
  hlsDrm: {
    url: 'https://stream.mux.com/FefhWnSMzDqz5z9yxssihdRx8dV6srhYJ8301uQBhRak.m3u8?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6InYiLCJleHAiOjIxNDc0ODM2NDd9.jXIpJZPB7diM5M6jMVRQ6dELY5YnONzC8jJClm7CT1nm-q25F5PiCvHcdLGqerjN1V_7T9cjhSX02p1i0UiABaKX2Wa4HCf6H6ZSKbY3MiCiRJHnfZzr_cVHCuBRXJlMzXesK_VzgP4kVrVi9-Sj8fGaeQmt4mB0sgtGGM7LpGV1IJdv_9aWnqQpQK7IeWi9ivNwa9Vw-PeppfOFdyQbqYJScIAY-_k6fzGaQucONyIolFGJZuBcan3nDRvCUpSFi0vPO87jf5Zbp6kn-HeARmUTYDPBLoeVSjttxYhoeDQYtNeqbuJ3Tj6S1_9TsE_SNSNZm3lxHoJCz5Wp_YcusQ',
  },
  /** DASH (Big Buck Bunny 30fps via Akamai). */
  dash: {
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
  /**
   * A **short** HLS/CMAF VOD — 15s across 3 segments, cut from the Dancing Dude
   * asset by Mux instant clip. Short on purpose: the background-video use case
   * loops indefinitely, and pinning "loops without stalling" needs several wraps
   * inside one test, which a full-length asset can't give.
   *
   * Clipping the **end** only leaves the media on its native 0-based timeline —
   * measured `baseMediaDecodeTime` is exactly 0 — so this isolates looping from
   * the timeline-origin question that {@link MEDIA.hlsShortNonZeroPts} asks.
   *
   * Mux rounds a clip out to segment boundaries, which is why a 12s request
   * yields 15s.
   */
  hlsShortLoop: {
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8?asset_end_time=12',
    /** Measured from the manifest, not declared by it — see the spec's tolerance. */
    durationSeconds: 15,
  },
  /**
   * The same shape as {@link MEDIA.hlsShortLoop} — 12s, 3 segments, fMP4 VOD —
   * but cut from 60s into the asset, so its media **encodes at a native PTS of
   * ~60s** while its presentation timeline still starts at 0.
   *
   * Measured, not assumed: the first segment's `tfdt` carries
   * `baseMediaDecodeTime = 5400090` at timescale 90000 → 60.001s. The unclipped
   * asset reads 0.043s, so the offset is the clip's doing.
   *
   * A composition that appends this without relocating it lands the buffer at
   * [60, 72] while the element's timeline expects [0, 12] — nothing at the
   * playhead, and a silent stall. Same asset the sandbox offers as
   * `hls-instant-clip`, shortened here for the same reason as above.
   */
  hlsShortNonZeroPts: {
    url: 'https://stream.mux.com/s41JYeqIpBMBzE4OzxDyGR2yrp2hD1CQ6gJN9SlVGDQ.m3u8?asset_start_time=60&asset_end_time=72',
    durationSeconds: 12,
    /** Measured native start of the first segment, in seconds. */
    nativeStartSeconds: 60.001,
  },
} as const;
