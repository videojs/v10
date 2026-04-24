/**
 * Parse a VTT segment using browser's native parser.
 *
 * Creates a dummy video element with a track element to leverage
 * the browser's optimized VTT parsing. Returns parsed VTTCue objects.
 */
export declare function resolveVttSegment(url: string): Promise<VTTCue[]>;
export declare function destroyVttResolver(): void;
//# sourceMappingURL=resolve-vtt-segment.d.ts.map
