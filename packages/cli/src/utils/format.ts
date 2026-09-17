import cdnMedia from '@/content/cdn-media.json';
import {
  generateHTMLInstallCode,
  generateHTMLUsageCode,
  generateReactCreateCode,
  generateReactInstallCode,
  type InstallationOptions,
} from '@/utils/installation/codegen';

const CDN_MEDIA_SUBPATHS = cdnMedia.map((entry) => entry.id);

export function formatInstallationCode(opts: InstallationOptions): string {
  if (opts.framework === 'html') {
    return formatHTMLInstallation(opts);
  }

  return formatReactInstallation(opts);
}

function formatHTMLInstallation(opts: InstallationOptions): string {
  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS);
  const usage = generateHTMLUsageCode(opts);
  const sections: string[] = [];

  sections.push('## Install Video.js\n');

  if (opts.installMethod === 'cdn') {
    sections.push(`\`\`\`html\n${install.cdn}\n\`\`\``);
  } else {
    sections.push(`\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``);
  }

  if (usage.imports) {
    sections.push('\n## TypeScript imports\n');
    sections.push(`\`\`\`ts\n${usage.imports}\n\`\`\``);
  }

  sections.push('\n## HTML\n');
  sections.push(`\`\`\`html\n${usage.html}\n\`\`\``);

  return sections.join('\n');
}

function formatReactInstallation(opts: InstallationOptions): string {
  const install = generateReactInstallCode(opts);
  const create = generateReactCreateCode(opts);

  const sections: string[] = [];

  if (opts.installMethod === 'cdn') {
    throw new Error('CDN install method is not supported for React');
  }

  sections.push('## Install Video.js\n');
  sections.push(`\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``);

  sections.push('\n## Add your player\n');
  sections.push('Add to `app/page.tsx`:\n');
  sections.push(`\`\`\`tsx\n${create['app/page.tsx']}\n\`\`\``);

  return sections.join('\n');
}
