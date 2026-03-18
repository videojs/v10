import { mirrorTemplatesToSrc, removeGeneratedSrcFiles } from './shared.js';

const created = await mirrorTemplatesToSrc();
const removed = await removeGeneratedSrcFiles();

for (const file of created) {
  console.log(`Created ${file}`);
}

for (const file of removed) {
  console.log(`Removed generated ${file}`);
}
