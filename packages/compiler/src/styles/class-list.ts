import type ts from 'typescript';
import type { StyleSegment } from './analyze';
import { resolveTokenPath } from './token-env';
import type { TokenValue } from './token-module';

export interface ResolvedExtractUtilities {
  utilities: readonly string[];
  passThrough: readonly ts.Expression[];
}

export function collectUtilities(segments: readonly StyleSegment[], env: Map<string, TokenValue>): string[] | null {
  const out: string[] = [];
  for (const seg of segments) {
    if (seg.kind === 'literal') {
      pushUtilities(out, seg.value);
      continue;
    }
    if (seg.kind === 'token') {
      const literal = resolveTokenPath(seg.path, env);
      if (literal === null) return null;
      pushUtilities(out, literal);
      continue;
    }
    return null;
  }
  return out;
}

export function flattenToLiteral(segments: readonly StyleSegment[], env: Map<string, TokenValue>): string | null {
  const utilities = collectUtilities(segments, env);
  if (utilities === null) return null;
  return utilities.join(' ');
}

export function collectExtractUtilities(
  segments: readonly StyleSegment[],
  env: Map<string, TokenValue>
): ResolvedExtractUtilities {
  const utilities: string[] = [];
  const passThrough: ts.Expression[] = [];

  for (const seg of segments) {
    if (seg.kind === 'literal') {
      pushUtilities(utilities, seg.value);
      continue;
    }
    if (seg.kind === 'token') {
      const literal = resolveTokenPath(seg.path, env);
      if (literal !== null) {
        pushUtilities(utilities, literal);
        continue;
      }
    }
    passThrough.push(seg.node);
  }

  return { utilities, passThrough };
}

function pushUtilities(out: string[], raw: string): void {
  for (const u of raw.split(/\s+/)) {
    if (u.length > 0) out.push(u);
  }
}
