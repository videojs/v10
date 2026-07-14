/**
 * Minimal ISO-BMFF (MP4/CMAF) box walker.
 *
 * Just enough to locate boxes by nested path — the framework needs a couple of
 * leaf fields (`mdhd` timescale, `tfdt` baseMediaDecodeTime) to derive a
 * segment's decode-time origin, not a full demuxer. DOM-free: operates on an
 * `ArrayBuffer` / `Uint8Array` via `DataView`.
 *
 * Box layout: `[u32 size][u32 type][payload]`. `size === 1` means a `u64
 * largesize` follows the type (payload after it); `size === 0` means the box
 * runs to the end of its container.
 */

/** A located box: its 4-char type and byte offsets within the buffer. */
export interface Box {
  type: string;
  /** Offset of the box's first byte (its size field). */
  start: number;
  /** Offset of the box's payload — after `size` + `type` (+ `largesize`). */
  dataStart: number;
  /** Offset one past the box's last byte. */
  end: number;
}

export function toDataView(data: ArrayBuffer | Uint8Array): DataView {
  return data instanceof Uint8Array ? new DataView(data.buffer, data.byteOffset, data.byteLength) : new DataView(data);
}

/** Read a 4-character box type / FourCC at `offset`. */
export function readFourCC(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

/** Iterate the boxes directly contained in `[start, end)`. */
export function* iterateBoxes(view: DataView, start = 0, end = view.byteLength): Generator<Box> {
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const type = readFourCC(view, offset + 4);
    let dataStart = offset + 8;
    if (size === 1) {
      size = Number(view.getBigUint64(offset + 8));
      dataStart = offset + 16;
    } else if (size === 0) {
      size = end - offset;
    }
    // A size smaller than its own header is malformed — stop rather than loop.
    if (size < dataStart - offset) return;
    yield { type, start: offset, dataStart, end: offset + size };
    offset += size;
  }
}

/** Iterate the direct child boxes of a given `type` within `[start, end)`. */
export function* iterateBoxesOfType(view: DataView, type: string, start = 0, end = view.byteLength): Generator<Box> {
  for (const box of iterateBoxes(view, start, end)) {
    if (box.type === type) yield box;
  }
}

/**
 * Depth-first descent to the first box matching a nested path, e.g.
 * `['moov', 'trak', 'mdia', 'mdhd']`. Returns `undefined` if any level is
 * absent.
 */
export function findBox(view: DataView, path: readonly string[], start = 0, end = view.byteLength): Box | undefined {
  const [head, ...rest] = path;
  for (const box of iterateBoxes(view, start, end)) {
    if (box.type !== head) continue;
    if (rest.length === 0) return box;
    const found = findBox(view, rest, box.dataStart, box.end);
    if (found) return found;
  }
  return undefined;
}

/**
 * Read the version byte of a FullBox — the `version(1) + flags(3)` header at the
 * start of the payload of `mdhd` / `tkhd` / `tfdt` / `hdlr` / `elst` / etc.
 */
export function readFullBoxVersion(view: DataView, dataStart: number): number {
  return view.getUint8(dataStart);
}
