import type { StyleSegment } from '../styles';

export interface StyleRecipe {
  className: string;
  candidates: readonly string[];
  segments: readonly StyleSegment[];
  scaffoldClassReplacements: ReadonlyMap<string, string>;
  chunk?: string | undefined;
}

export interface StyleProgram {
  recipes: readonly StyleRecipe[];
  candidates: readonly string[];
}

export interface MutableStyleProgram {
  recipes: Map<string, MutableStyleRecipe>;
  candidates: string[];
  candidateSet: Set<string>;
  scaffoldClassReplacementsByChunk: Map<string, Map<string, string>>;
}

interface MutableStyleRecipe {
  className: string;
  candidates: string[];
  candidateSet: Set<string>;
  segments: readonly StyleSegment[];
  chunk?: string | undefined;
}

export function createStyleProgram(): MutableStyleProgram {
  return {
    recipes: new Map(),
    candidates: [],
    candidateSet: new Set(),
    scaffoldClassReplacementsByChunk: new Map(),
  };
}

export function addStyleRecipe(
  program: MutableStyleProgram,
  recipe: Omit<StyleRecipe, 'candidates' | 'scaffoldClassReplacements'> & { candidates: readonly string[] }
): void {
  const key = `${recipe.chunk ?? ''}\0${recipe.className}`;
  let current = program.recipes.get(key);

  if (!current) {
    current = {
      className: recipe.className,
      candidates: [],
      candidateSet: new Set(),
      segments: recipe.segments,
      ...(recipe.chunk === undefined ? {} : { chunk: recipe.chunk }),
    };
    program.recipes.set(key, current);
  }

  for (const candidate of recipe.candidates) {
    if (!current.candidateSet.has(candidate)) {
      current.candidateSet.add(candidate);
      current.candidates.push(candidate);
    }
    if (!program.candidateSet.has(candidate)) {
      program.candidateSet.add(candidate);
      program.candidates.push(candidate);
    }
  }
}

export function finalizeStyleProgram(program: MutableStyleProgram): StyleProgram {
  return {
    recipes: [...program.recipes.values()].map(({ candidateSet: _, ...recipe }) => ({
      ...recipe,
      scaffoldClassReplacements: new Map(program.scaffoldClassReplacementsByChunk.get(recipe.chunk ?? '')),
    })),
    candidates: program.candidates,
  };
}
