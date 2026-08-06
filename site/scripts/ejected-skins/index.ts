import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import { type EjectedSkinEntry, SKINS, type SkinDef } from './config.ts';
import { processHtmlSkin } from './html.ts';
import { processReactSkin, resolveCss } from './react.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, '../../src/content/ejected-skins.json');
const prefix = '\x1b[35m[ejected-skins]\x1b[0m';

const outputSchema = z.array(
  z.discriminatedUnion('platform', [
    z.object({
      id: z.string(),
      name: z.string(),
      platform: z.literal('html'),
      style: z.enum(['css', 'tailwind']),
      html: z.string(),
      css: z.string().optional(),
    }),
    z.object({
      id: z.string(),
      name: z.string(),
      platform: z.literal('react'),
      style: z.enum(['css', 'tailwind']),
      tsx: z.record(z.string(), z.string()),
      jsx: z.record(z.string(), z.string()),
      css: z.string().optional(),
    }),
  ])
);

export async function buildEjectedSkin(skin: SkinDef): Promise<EjectedSkinEntry> {
  const entry: EjectedSkinEntry = {
    id: skin.id,
    name: skin.name,
    platform: skin.platform,
    style: skin.style,
  };

  if (skin.platform === 'html') {
    entry.html = await processHtmlSkin(skin);
  } else {
    const { tsx, jsx } = await processReactSkin(skin);
    entry.tsx = tsx;
    entry.jsx = jsx;
  }

  if (skin.css) {
    entry.css = resolveCss(skin.css);
  }

  return entry;
}

export async function generateEjectedSkins(skins: SkinDef[] = SKINS): Promise<EjectedSkinEntry[]> {
  const entries: EjectedSkinEntry[] = [];

  for (const skin of skins) {
    console.log(prefix, `Processing: ${skin.id}`);
    entries.push(await buildEjectedSkin(skin));
  }

  return outputSchema.parse(entries);
}

export async function main(): Promise<void> {
  console.log(prefix, 'Building ejected skins...\n');
  const entries = await generateEjectedSkins();

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(prefix, `✅ Wrote ${entries.length} entries to ${outputPath}`);
}
