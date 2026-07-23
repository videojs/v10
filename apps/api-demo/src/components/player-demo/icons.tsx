/**
 * Button glyphs. We use plain unicode characters (rendered in the button's
 * current color) instead of SVGs to keep the controls lightweight and simple.
 */
// Render symbol glyphs with the system UI / symbol fonts (not the page's display
// font) so characters like ►, ↻, and ⛶ render cleanly across platforms.
const GLYPH_FONT = '"Arial", sans-serif';

function Glyph({ children, className }: { children: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`leading-none ${className ?? 'text-xl'}`} style={{ fontFamily: GLYPH_FONT }}>
      {children}
    </span>
  );
}

export function PlayIcon() {
  return <Glyph>►</Glyph>;
}

export function PauseIcon() {
  return <Glyph>⏸</Glyph>;
}

export function VolumeIcon() {
  return <Glyph>♪</Glyph>;
}

export function MuteIcon() {
  // Music note with a combining slash overlay = muted.
  return <Glyph>{'♪\u0338'}</Glyph>;
}

export function LoopIcon() {
  return <Glyph>↻</Glyph>;
}

export function CloseIcon() {
  return <Glyph className="text-lg">×</Glyph>;
}

export function FullscreenEnterIcon() {
  return <Glyph>⛶</Glyph>;
}

export function FullscreenExitIcon() {
  return <Glyph>⛶</Glyph>;
}

export function PipEnterIcon() {
  return <Glyph>⧉</Glyph>;
}

export function PipExitIcon() {
  return <Glyph>⧉</Glyph>;
}

export function RemoteIcon() {
  return <Glyph>⎙</Glyph>;
}
