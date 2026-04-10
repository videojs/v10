import {
  generateHTMLInstallCode,
  generateHTMLUsageCode,
  generateReactCreateCode,
  generateReactInstallCode,
  generateReactUsageCode,
  type InstallationOptions,
} from '@/utils/installation/codegen';

export function formatInstallationCode(opts: InstallationOptions): string {
  if (opts.framework === 'html') {
    return formatHTMLInstallation(opts);
  }
  return formatReactInstallation(opts);
}

function formatHTMLInstallation(opts: InstallationOptions): string {
  const install = generateHTMLInstallCode(opts);
  const usage = generateHTMLUsageCode(opts);
  const sections: string[] = [];

  sections.push('## Install Video.js\n');
  if (opts.installMethod === 'cdn') {
    sections.push(`\`\`\`html\n${install.cdn}\n\`\`\``);
  } else {
    sections.push(`\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``);
  }

  if (usage.js) {
    sections.push('\n## JavaScript imports\n');
    sections.push(`\`\`\`javascript\n${usage.js}\n\`\`\``);
  }

  sections.push('\n## HTML\n');
  sections.push(`\`\`\`html\n${usage.html}\n\`\`\``);

  return sections.join('\n');
}

function formatReactInstallation(opts: InstallationOptions): string {
  const install = generateReactInstallCode();
  const create = generateReactCreateCode(opts);
  const usage = generateReactUsageCode(opts);
  const sections: string[] = [];

  if (opts.installMethod === 'cdn') {
    throw new Error('CDN install method is not supported for React');
  }

  sections.push('## Install Video.js\n');
  sections.push(`\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``);

  sections.push('\n## Create your player\n');
  sections.push('Add to `./components/player/index.tsx`:\n');
  sections.push(`\`\`\`tsx\n${create['MyPlayer.tsx']}\n\`\`\``);

  sections.push('\n## Use your player\n');
  sections.push(`\`\`\`tsx\n${usage['App.tsx']}\n\`\`\``);

  return sections.join('\n');
}
