import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const templatesDir = resolve(root, 'templates');
const srcDir = resolve(root, 'src');

function mirror(dir: string) {
  for (const entry of readdirSync(dir)) {
    const templatePath = resolve(dir, entry);
    const targetPath = resolve(srcDir, templatePath.slice(templatesDir.length + 1));

    if (statSync(templatePath).isDirectory()) {
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
