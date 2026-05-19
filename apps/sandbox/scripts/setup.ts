import { mirrorTemplatesToSrc, removeGeneratedSrcFiles, syncTemplatesToSrc } from './shared.js';

const synced = await syncTemplatesToSrc();
const created = await mirrorTemplatesToSrc();
const removed = await removeGeneratedSrcFiles();

for (const file of synced) {
  console.log(`Synced ${file}`);
}

for (const file of created) {
  console.log(`Created ${file}`);
}

for (const file of removed) {
  console.log(`Removed generated ${file}`);
}
