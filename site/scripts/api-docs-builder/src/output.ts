import * as fs from 'node:fs';
import * as path from 'node:path';

interface ValidationIssue {
  path: readonly PropertyKey[];
  message: string;
}

interface Schema<T> {
  safeParse(
    value: unknown
  ): { success: true; data: T } | { success: false; error: { issues: readonly ValidationIssue[] } };
}

export interface GeneratedDoc<T = unknown> {
  /** Output filename including the `.json` extension. */
  fileName: string;
  /** Human-readable name used in diagnostics. */
  label: string;
  data: T;
  /** Optional context appended to the generated-file log line. */
  detail?: string;
}

export interface ReferenceGroup<T = unknown> {
  name: string;
  outputPath: string;
  schema: Schema<T>;
  docs: GeneratedDoc[];
  /** Guard against silently replacing a known collection with incomplete output. */
  minimumDocs?: number;
}

export interface ValidatedReferenceGroup {
  name: string;
  outputPath: string;
  docs: GeneratedDoc[];
}

export interface ReferenceValidationError {
  label: string;
  issues: readonly ValidationIssue[];
}

export type ReferenceGroupValidation =
  | { success: true; group: ValidatedReferenceGroup }
  | { success: false; name: string; errors: ReferenceValidationError[] };

/** Validate a complete output group before any generated files are changed. */
export function validateReferenceGroup<T>(group: ReferenceGroup<T>): ReferenceGroupValidation {
  const docs: GeneratedDoc[] = [];
  const errors: ReferenceValidationError[] = [];
  const seenFileNames = new Set<string>();
  const minimumDocs = group.minimumDocs ?? 0;

  if (group.docs.length < minimumDocs) {
    errors.push({
      label: group.name,
      issues: [
        {
          path: [],
          message: `Expected at least ${minimumDocs} generated document(s), received ${group.docs.length}`,
        },
      ],
    });
  }

  for (const doc of group.docs) {
    if (path.basename(doc.fileName) !== doc.fileName || !doc.fileName.endsWith('.json')) {
      errors.push({
        label: doc.label,
        issues: [{ path: ['fileName'], message: `Invalid generated filename: ${doc.fileName}` }],
      });
      continue;
    }

    if (seenFileNames.has(doc.fileName)) {
      errors.push({
        label: doc.label,
        issues: [{ path: ['fileName'], message: `Duplicate generated filename: ${doc.fileName}` }],
      });
      continue;
    }
    seenFileNames.add(doc.fileName);

    const validated = group.schema.safeParse(doc.data);
    if (!validated.success) {
      errors.push({ label: doc.label, issues: validated.error.issues });
      continue;
    }

    docs.push({ ...doc, data: validated.data });
  }

  if (errors.length > 0) {
    return { success: false, name: group.name, errors };
  }

  return {
    success: true,
    group: {
      name: group.name,
      outputPath: group.outputPath,
      docs,
    },
  };
}

/**
 * Write a validated group and remove JSON files that are no longer generated.
 * Non-JSON files are left untouched.
 */
export function writeReferenceGroup(group: ValidatedReferenceGroup): { written: number; removed: string[] } {
  const parentPath = path.dirname(group.outputPath);
  fs.mkdirSync(parentPath, { recursive: true });

  // Stage every serialized file before touching the current output.
  const stagingPath = fs.mkdtempSync(path.join(parentPath, `.${path.basename(group.outputPath)}-`));

  try {
    for (const doc of group.docs) {
      fs.writeFileSync(path.join(stagingPath, doc.fileName), `${JSON.stringify(doc.data, null, 2)}\n`);
    }

    fs.mkdirSync(group.outputPath, { recursive: true });

    const expectedFiles = new Set(group.docs.map((doc) => doc.fileName));
    const removed: string[] = [];

    for (const doc of group.docs) {
      fs.renameSync(path.join(stagingPath, doc.fileName), path.join(group.outputPath, doc.fileName));
    }

    for (const fileName of fs.readdirSync(group.outputPath)) {
      if (!fileName.endsWith('.json') || expectedFiles.has(fileName)) continue;
      fs.unlinkSync(path.join(group.outputPath, fileName));
      removed.push(fileName);
    }

    return { written: group.docs.length, removed };
  } finally {
    fs.rmSync(stagingPath, { recursive: true, force: true });
  }
}
