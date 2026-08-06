import { access, readFile } from 'node:fs/promises';

const packageUrl = new URL('../package.json', import.meta.url);
const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'));

for (const [subpath, conditions] of Object.entries(packageJson.exports)) {
  for (const [condition, target] of Object.entries(conditions)) {
    const targetUrl = new URL(`../${target.slice(2)}`, import.meta.url);

    try {
      await access(targetUrl);
      if (condition === 'default') await import(targetUrl.href);
    } catch (error) {
      throw new Error(`Invalid ${subpath} ${condition} export: ${target}`, { cause: error });
    }
  }
}
