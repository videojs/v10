import type { InstallationDiscoveryCompatibility } from './options';
import { installationParameterForKey } from './parameters';
import {
  INSTALLATION_STEP_CONDITIONS,
  installationSelectedOptions,
  type InstallationCodeBlock,
  type InstallationDiscovery,
  type InstallationPlan,
  type InstallationPlanFormat,
  type InstallationStep,
} from './plan';
import { INSTALLATION_FRAMEWORKS } from './projects';
import { containsControlCharacter, type SelectionError } from './selection';

function fenced(language: string, value: string): string {
  const longestRun = Math.max(2, ...[...value.matchAll(/`+/g)].map((match) => match[0].length));
  const marker = '`'.repeat(longestRun + 1);

  return `${marker}${language}\n${value}\n${marker}`;
}

function inlineCode(value: string): string {
  const longestRun = Math.max(0, ...[...value.matchAll(/`+/g)].map((match) => match[0].length));
  const marker = '`'.repeat(longestRun + 1);
  const padding = /^[` ]|[` ]$/.test(value) ? ' ' : '';

  return `${marker}${padding}${value}${padding}${marker}`;
}

export function renderInstallationCompatibilityMarkdown(compatibility: InstallationDiscoveryCompatibility): string {
  const mediaCompatibility = Object.entries(compatibility.mediaByPreset)
    .map(([preset, media]) => `- \`${preset}\`: ${media.map((value) => `\`${value}\``).join(', ')}`)
    .join('\n');
  const frameworks = INSTALLATION_FRAMEWORKS.filter(
    (framework) => compatibility.methodsByFramework[framework] !== undefined
  );
  const shadcnCompatibility = frameworks
    .map((framework) => {
      const templates = (compatibility.templatesByFramework[framework] ?? []).map((value) => `\`${value}\``).join(', ');
      const stylings = (compatibility.shadcn.stylingsByFramework[framework] ?? [])
        .map((value) => `\`${value}\``)
        .join(', ');
      const shadcnStylings = stylings ? `; Shadcn styling ${stylings}` : '';

      return `- \`${framework}\`: app setups ${templates}${shadcnStylings}`;
    })
    .join('\n');

  const packageDescription = frameworks.includes('react')
    ? frameworks.length === 1
      ? '- React instructions install `@videojs/react`.'
      : '- React instructions install `@videojs/react`. HTML, Vue, and Svelte instructions install `@videojs/html`.'
    : '- HTML, Vue, and Svelte instructions install `@videojs/html`.';
  const cdnDescription = frameworks.some((framework) => compatibility.methodsByFramework[framework]?.includes('cdn'))
    ? '\n- CDN is plain HTML only. Use `--project existing --template none` for an existing page or `--project new --template vite` to scaffold a minimal app.'
    : '';
  const shadcnDescription = frameworks.includes('react')
    ? frameworks.length === 1
      ? '- Shadcn installs editable React skin source.'
      : '- Shadcn installs editable React or plain HTML skin source. Vue and Svelte use packaged installation.'
    : '- Shadcn installs editable plain HTML skin source. Vue and Svelte use packaged installation.';

  return `${packageDescription}${cdnDescription}
${shadcnDescription}
- The \`none\` app setup is available only for plain HTML with Packaged or CDN. Shadcn requires a named app setup.
- Shadcn presets: ${compatibility.shadcn.presets.map((value) => `\`${value}\``).join(', ')}.
- Shadcn skins: ${compatibility.shadcn.skins.map((value) => `\`${value}\``).join(', ')}.

### Media sources by preset

${mediaCompatibility}

### App setup and Shadcn styling by framework

${shadcnCompatibility}`;
}

function definitionList(definitions: Readonly<Record<string, string>>): string {
  return Object.entries(definitions)
    .map(([name, description]) => `- \`${name}\`: ${description}`)
    .join('\n');
}

function renderPlanFormatMarkdown(format: InstallationPlanFormat): string {
  return `Instruction plans list their steps in order. The JSON plan carries these fields, and the Markdown plan shows the same information in each step.

${definitionList(format.fields)}

Operations:

${definitionList(format.operations)}

Placements:

${definitionList(format.placements)}

Conditions:

${definitionList(format.conditions)}`;
}

export function renderDiscoveryMarkdown(discovery: InstallationDiscovery): string {
  const options = discovery.options
    .map((option) => {
      const values = option.values ? ` Values: ${option.values.map((value) => `\`${value}\``).join(', ')}.` : '';
      const applies = option.appliesWhen ? ` Applies when ${option.appliesWhen}.` : '';

      return `- \`${option.flag}\`: ${option.description}${values} Default: ${option.default}.${applies}`;
    })
    .join('\n');

  const decisions = discovery.decisionOrder
    .map(({ title, guidance }, index) => `${index + 1}. **${title}.** ${guidance}`)
    .join('\n');

  return `# Video.js installation instruction options

Package: \`${discovery.package}@${discovery.packageVersion}\`

${discovery.notice}

## Usage

${fenced('sh', discovery.command)}

Running the command above without selection flags shows this option reference and exits successfully. Add any selection flag to receive complete instructions; omitted choices use the defaults below.

## Decide in this order

${decisions}

## Options

${options}

## Compatibility

${renderInstallationCompatibilityMarkdown(discovery.compatibility)}

## Plan format

${renderPlanFormatMarkdown(discovery.planFormat)}

## Examples

${discovery.examples.map((example) => fenced('sh', example)).join('\n\n')}
`;
}

export interface InstallationMarkdownOptions {
  /** A warning shown before the selections, such as a mismatch with the project's installed player version. */
  versionNotice?: string;
}

export function renderInstallationMarkdown(plan: InstallationPlan, options: InstallationMarkdownOptions = {}): string {
  const title = { react: 'React', html: 'HTML', vue: 'Vue', svelte: 'Svelte' }[plan.selection.framework];
  const versionNotice = options.versionNotice ? `> **Version mismatch.** ${options.versionNotice}\n\n` : '';

  return `# ${title} installation instructions

Generated by \`${plan.package}@${plan.packageVersion}\` for \`${plan.playerPackage}\`. The selections below correspond to CLI flags. Change them with the command shown under **Reproduce or change these instructions**, or run the bare \`agents init\` command for every valid option.

${versionNotice}${renderInstallationPlanSections(plan)}
## Next steps

${plan.next.map(({ label, url }) => `- [${label}](${url})`).join('\n')}
`;
}

function blockInstruction(block: InstallationCodeBlock): string | null {
  if (block.operation === 'run') {
    return block.longRunning ? '_Long-running: start it in the background, verify the result, then stop it._' : null;
  }

  if (block.operation === 'create') return '_Create this file._';

  if (block.operation === 'replace') {
    return block.anchor
      ? `_Replace ${inlineCode(block.anchor)} with this block._`
      : '_Replace the whole file with this block._';
  }

  if (block.placement === 'head') return '_Merge this into the page `<head>`._';

  if (block.placement === 'body') return '_Merge this into the page `<body>` where the player should appear._';

  return '_Merge this into the existing file, or create the file when it is missing._';
}

function renderBlock(block: InstallationCodeBlock): string {
  const placement = block.placement ? ` (${block.placement})` : '';
  const heading = block.filename ? `### \`${block.filename}\`${placement}` : null;
  const inserts = (block.insertContents ?? []).map(
    ({ anchor, from }) => `_Then replace ${inlineCode(anchor)} with the full contents of \`${from}\`._`
  );

  return [heading, blockInstruction(block), fenced(block.language, block.code), ...inserts]
    .filter((paragraph) => paragraph !== null)
    .join('\n\n');
}

function renderStep(step: InstallationStep): string {
  const condition = step.condition ? `_${INSTALLATION_STEP_CONDITIONS[step.condition]}_` : null;
  const workingDirectory = step.workingDirectory === '.' ? null : `_Working directory: \`${step.workingDirectory}\`._`;
  const removeFiles = step.removeFiles
    ? `Delete these starter files if present: ${step.removeFiles.map((filename) => `\`${filename}\``).join(', ')}.`
    : null;

  return [
    `## ${step.title}`,
    condition,
    workingDirectory,
    step.description ?? null,
    ...step.blocks.map(renderBlock),
    removeFiles,
  ]
    .filter((paragraph) => paragraph !== null)
    .join('\n\n');
}

export function renderInstallationPlanSections(plan: InstallationPlan): string {
  const selected = installationSelectedOptions(plan);
  const defaulted =
    plan.selection.defaulted.length > 0
      ? plan.selection.defaulted
          .map((key) => {
            const query = installationParameterForKey(key).query;
            const source = plan.selection.defaultSources[key];

            return source ? `${query} (${selected[query]} from ${source})` : query;
          })
          .join(', ')
      : 'none';
  const selection = Object.entries(selected)
    .map(([key, value]) => `- \`${key}\`: ${inlineCode(value)}`)
    .join('\n');

  return `## Selected options

${selection}

Defaulted options: ${defaulted}.

## Reproduce or change these instructions

${fenced('sh', plan.reproduceCommand)}

${plan.steps.map(renderStep).join('\n\n')}

> ${plan.notice}
`;
}

const MAX_ERROR_VALUE_LENGTH = 80;

/** Quote a rejected value on one line so line breaks and control characters cannot shape the terminal output. */
function errorValue(value: string): string {
  const characters = Array.from(value);
  const shown =
    characters.length > MAX_ERROR_VALUE_LENGTH ? [...characters.slice(0, MAX_ERROR_VALUE_LENGTH - 1), '…'] : characters;
  const escaped = shown
    .map((character) => {
      if (character === '"' || character === '\\') return `\\${character}`;

      if (!containsControlCharacter(character)) return character;

      return `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`;
    })
    .join('');

  return `"${escaped}"`;
}

export function renderSelectionErrors(errors: readonly SelectionError[]): string {
  return `Invalid installation options:\n${errors
    .map((error) => {
      const field = error.field === 'arguments' ? 'arguments' : installationParameterForKey(error.field).flag;
      const value = error.value === undefined ? '' : ` ${errorValue(error.value)}`;
      const hint = error.hint ? ` ${error.hint}` : '';

      return `- ${field}${value}: ${error.message}${hint}`;
    })
    .join('\n')}`;
}
