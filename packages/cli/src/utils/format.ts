import ejectedSkins from '@/content/ejected-skins.json';
import {
  generateHTMLInstallCode,
  generateHTMLUsageCode,
  generateReactCreateCode,
  generateReactInstallCode,
  generateReactUsageCode,
  type InstallationOptions,
} from '@/utils/installation/codegen';
import type { Skin } from '@/utils/installation/types';

const SKIN_TO_BASE_ID: Record<Skin, string> = {
  video: 'default-video',
  audio: 'default-audio',
  'minimal-video': 'minimal-video',
  'minimal-audio': 'minimal-audio',
};

export function formatInstallationCode(opts: InstallationOptions): string {
  if (opts.embedMethod === 'ejected' && opts.useCase !== 'background-video') {
    return formatEjectedInstallation(opts);
  }
  if (opts.framework === 'html') {
    return formatHTMLInstallation(opts);
  }
  return formatReactInstallation(opts);
}

function formatEjectedInstallation(opts: InstallationOptions): string {
  const id = `${SKIN_TO_BASE_ID[opts.skin]}${opts.framework === 'react' ? '-react' : ''}`;
  const entry = ejectedSkins.find((s) => s.id === id && s.style === 'css');
  if (!entry) throw new Error(`Ejected skin not found: ${id}`);

  const sections: string[] = [];

  sections.push('## Install Video.js\n');
  if (opts.framework === 'html') {
    const install = generateHTMLInstallCode(opts);
    if (opts.installMethod === 'cdn') {
      sections.push(`\`\`\`html\n${install.cdn}\n\`\`\``);
    } else {
      sections.push(`\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``);
    }
  } else {
    const install = generateReactInstallCode();
    sections.push(`\`\`\`bash\n${install[opts.installMethod as 'npm' | 'pnpm' | 'yarn' | 'bun']}\n\`\`\``);
  }

  sections.push('\n## Your skin\n');
  sections.push("Copy this into your project — it's yours to customize.\n");

  if ('tsx' in entry && entry.tsx) {
    sections.push('### Skin.tsx\n');
    sections.push(`\`\`\`tsx\n${entry.tsx}\n\`\`\``);
  } else if ('html' in entry && entry.html) {
    sections.push('### skin.html\n');
    sections.push(`\`\`\`html\n${entry.html}\n\`\`\``);
  }

  if ('css' in entry && entry.css) {
    sections.push('\n### skin.css\n');
    sections.push(`\`\`\`css\n${entry.css}\n\`\`\``);
  }

  return sections.join('\n');
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
