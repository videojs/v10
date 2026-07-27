/**
 * Hand-built ISO-BMFF boxes for unit tests — precise control over
 * version/field layout and multi-track muxing without committing binary
 * segment fixtures. Real-stream validation of the parsers lives in the
 * non-zero-PTS spike probes, not here.
 */

export function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value);
  return out;
}

export function u64(value: number | bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(value));
  return out;
}

function fourcc(type: string): Uint8Array {
  return new Uint8Array([type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)]);
}

/** A standard box: `[u32 size][4-char type][payload]`. */
export function box(type: string, ...children: Uint8Array[]): Uint8Array {
  const payload = concat(...children);
  const out = new Uint8Array(8 + payload.length);
  new DataView(out.buffer).setUint32(0, out.length);
  out.set(fourcc(type), 4);
  out.set(payload, 8);
  return out;
}

/** A 64-bit-`largesize` box (`size` field === 1). */
export function largeBox(type: string, ...children: Uint8Array[]): Uint8Array {
  const payload = concat(...children);
  const out = new Uint8Array(16 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 1);
  out.set(fourcc(type), 4);
  view.setBigUint64(8, BigInt(out.length));
  out.set(payload, 16);
  return out;
}

const flags = new Uint8Array(3);
const versionFlags = (version: 0 | 1) => new Uint8Array([version, 0, 0, 0]);

/** `mdhd` FullBox carrying `timescale`. v0 = 32-bit dates, v1 = 64-bit dates. */
export function mdhd(timescale: number, version: 0 | 1 = 0): Uint8Array {
  const dates = version === 1 ? concat(u64(0), u64(0)) : concat(u32(0), u32(0));
  const duration = version === 1 ? u64(0) : u32(0);
  return box('mdhd', new Uint8Array([version]), flags, dates, u32(timescale), duration);
}

/** `tkhd` FullBox carrying `track_id`. */
export function tkhd(trackId: number, version: 0 | 1 = 0): Uint8Array {
  const dates = version === 1 ? concat(u64(0), u64(0)) : concat(u32(0), u32(0));
  return box('tkhd', versionFlags(version), dates, u32(trackId), u32(0) /* reserved */);
}

/** `hdlr` FullBox: version+flags, pre_defined, `handler_type`, reserved, name. */
export function hdlr(handlerType: string): Uint8Array {
  return box(
    'hdlr',
    versionFlags(0),
    u32(0) /* pre_defined */,
    fourcc(handlerType),
    new Uint8Array(12),
    new Uint8Array([0])
  );
}

/** `tfdt` FullBox carrying `baseMediaDecodeTime`. v0 = 32-bit, v1 = 64-bit. */
export function tfdt(baseMediaDecodeTime: number | bigint, version: 0 | 1 = 0): Uint8Array {
  const value = version === 1 ? u64(baseMediaDecodeTime) : u32(Number(baseMediaDecodeTime));
  return box('tfdt', versionFlags(version), value);
}

/** `tfhd` FullBox carrying `track_id` (right after version+flags). */
export function tfhd(trackId: number): Uint8Array {
  return box('tfhd', versionFlags(0), u32(trackId));
}

export interface TrakSpec {
  handler: string;
  trackId: number;
  timescale: number;
  mdhdVersion?: 0 | 1;
  tkhdVersion?: 0 | 1;
}

/** A `trak`: `tkhd` + `mdia > (hdlr, mdhd)`. */
export function trak({ handler, trackId, timescale, mdhdVersion = 0, tkhdVersion = 0 }: TrakSpec): Uint8Array {
  return box('trak', tkhd(trackId, tkhdVersion), box('mdia', hdlr(handler), mdhd(timescale, mdhdVersion)));
}

/** An init segment: `ftyp` + `moov > (mvhd, ...traks)`. */
export function initSegment(...traks: Uint8Array[]): Uint8Array {
  return concat(box('ftyp', u32(0)), box('moov', box('mvhd', u32(0)), ...traks));
}

export interface TrafSpec {
  trackId: number;
  baseMediaDecodeTime: number | bigint;
  version?: 0 | 1;
}

/** A media segment: `styp` + `moof > (mfhd, ...traf)`, each `traf` = `tfhd` + `tfdt`. */
export function mediaSegment(...trafs: TrafSpec[]): Uint8Array {
  const trafBoxes = trafs.map((t) => box('traf', tfhd(t.trackId), tfdt(t.baseMediaDecodeTime, t.version ?? 0)));
  return concat(box('styp', u32(0)), box('moof', box('mfhd', u32(0)), ...trafBoxes));
}
