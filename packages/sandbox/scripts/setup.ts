import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const templatesDir = resolve(root, 'templates');
const srcDir = resolve(root, 'src');

/** Recursively copy template files into `src/`, preserving relative paths. */
function mirror(dir: string) {
  for (const entry of readdirSync(dir)) {
    const templatePath = resolve(dir, entry);
    const targetPath = resolve(srcDir, templatePath.slice(templatesDir.length + 1));

    if (statSync(templatePath).isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      mirror(templatePath);
      continue;
    }

    if (!existsSync(targetPath)) {
      copyFileSync(templatePath, targetPath);
      console.log(`Created ${targetPath.slice(root.length + 1)}`);
    }
  }
}

mirror(templatesDir);
