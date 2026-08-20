import type { DesignSystem } from './design-system';
import { emitStylesheets } from './emitter';
import {
  isGroupMarker,
  isGroupPeerMarker,
  isPeerMarker,
  type StyleManifest,
  type StyleManifestRule,
  utilitiesForRule,
} from './manifest';
import type { StyleOutputFile, StyleOutputRule } from './output';

export interface CompileStylesOptions {
  readonly design: DesignSystem;
  readonly manifest: StyleManifest;
  readonly scope?: string | undefined;
  readonly variant?: string | undefined;
  /** Restrict CSS emission to semantic class names referenced by the compiled source graph. */
  readonly ruleClassNames?: ReadonlySet<string> | undefined;
}

/** Compile semantic rules and group the resulting CSS by each definition's explicit output file. */
export async function compileStyles(options: CompileStylesOptions): Promise<Map<string, string>> {
  const relationships = collectRelationships(options.manifest.rules, options.variant);

  const byFile = new Map<string, StyleOutputFile & { rules: StyleOutputRule[] }>();

  for (const rule of [...options.manifest.rules].sort((a, b) => a.className.localeCompare(b.className))) {
    if (options.ruleClassNames && !options.ruleClassNames.has(rule.className)) continue;

    const compiled = compileRule(rule, options.design, options.variant);

    if (compiled.candidates.length === 0) continue;

    const existing = byFile.get(rule.file);

    if (existing) {
      existing.rules.push(compiled);
      continue;
    }

    byFile.set(rule.file, {
      name: rule.file,
      layer: rule.layer,
      rules: [compiled],
      groupOwners: relationships.groupOwners,
      peerOwners: relationships.peerOwners,
    });
  }

  const emitted = await emitStylesheets({
    design: options.design,
    ...(options.scope ? { scope: options.scope } : {}),
    files: [...byFile.values()],
  });

  const outputFiles = new Set(options.manifest.rules.map((rule) => rule.file));

  return new Map([...outputFiles].sort().map((file) => [file, emitted.get(file) ?? '']));
}

function compileRule(rule: StyleManifestRule, design: DesignSystem, variant?: string): StyleOutputRule {
  const candidates: string[] = [];
  const unsupported: string[] = [];

  for (const utility of utilitiesForRule(rule, variant)) {
    if (isGroupPeerMarker(utility)) continue;
    if (design.recognizesCandidate(utility)) candidates.push(utility);
    else unsupported.push(utility);
  }

  if (unsupported.length > 0) {
    throw new Error(
      `Style rule \`${rule.tokenPath.join('.')}\` contains unsupported utilities: ${unsupported.join(' ')}. ` +
        'Keep literal public classes in markup instead of the style definition.'
    );
  }

  return { className: rule.className, candidates, scopeRoot: rule.scopeRoot };
}

function collectRelationships(
  rules: readonly StyleManifestRule[],
  variant?: string
): {
  groupOwners: ReadonlyMap<string, string>;
  peerOwners: ReadonlyMap<string, string>;
} {
  const groupOwners = new Map<string, string>();
  const peerOwners = new Map<string, string>();

  for (const rule of rules) {
    for (const utility of utilitiesForRule(rule, variant)) {
      if (isPeerMarker(utility)) {
        registerRelationshipOwner(peerOwners, utility, rule);
        continue;
      }

      if (!isGroupMarker(utility)) continue;
      registerRelationshipOwner(groupOwners, utility, rule);
    }
  }

  return { groupOwners, peerOwners };
}

function registerRelationshipOwner(owners: Map<string, string>, utility: string, rule: StyleManifestRule): void {
  const previous = owners.get(utility);

  if (previous && previous !== rule.className) {
    throw new Error(`Style relationship marker \`${utility}\` maps to both \`${previous}\` and \`${rule.className}\`.`);
  }

  owners.set(utility, rule.className);
}
