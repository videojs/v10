import clsx from 'clsx';
import { Check, Copy, FileCode2, Folder } from 'lucide-react';
import { Suspense, use, useId, useMemo, useState } from 'react';

import { getClientHighlighter } from '@/components/Code/clientHighlighter';
import { highlightCode } from '@/components/Code/Shared';
import { shared } from '@/components/typography/styles';
import type { RegistrySourceFile } from '@/utils/installation/shadcn-registry';

interface SourceExplorerProps {
  readonly files: readonly RegistrySourceFile[];
  readonly initialPath?: string | undefined;
}

interface Directory {
  readonly files: readonly RegistrySourceFile[];
  readonly path: string;
}

export default function SourceExplorer(props: SourceExplorerProps) {
  return (
    <Suspense fallback={<SourceExplorerFallback />}>
      <SourceExplorerInner {...props} />
    </Suspense>
  );
}

function SourceExplorerInner({ files, initialPath }: SourceExplorerProps) {
  const highlighter = use(getClientHighlighter());
  const selectId = useId();
  const initialFile = files.find((file) => file.path === initialPath) ?? files[0];
  const [selectedPath, setSelectedPath] = useState(initialFile?.path ?? '');
  const [copied, setCopied] = useState(false);
  const selected = files.find((file) => file.path === selectedPath) ?? initialFile;
  const directories = useMemo(() => groupByDirectory(files), [files]);

  if (!selected) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(selected.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const highlighted = highlightCode(selected.code, selected.lang, highlighter);

  return (
    <div className="border-manila-75 bg-manila-light dark:border-warm-gray dark:bg-soot my-6 overflow-hidden rounded-xs border">
      <div className="border-manila-75 dark:border-warm-gray flex items-center gap-2 border-b p-2.5 md:hidden">
        <label className="sr-only" htmlFor={selectId}>
          Source file
        </label>
        <select
          id={selectId}
          className="border-manila-75 bg-manila-light text-code dark:border-warm-gray dark:bg-faded-black min-w-0 flex-1 rounded-xs border px-2.5 py-1.5 font-mono"
          value={selected.path}
          onChange={(event) => setSelectedPath(event.target.value)}
        >
          {files.map((file) => (
            <option key={file.path} value={file.path}>
              {file.path}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-h-80 md:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)]">
        <nav
          aria-label="Source files"
          className="border-manila-75 dark:border-warm-gray hidden max-h-128 overflow-auto border-r p-2.5 md:block"
        >
          {directories.map((directory) => (
            <div key={directory.path} className="mb-3 last:mb-0">
              <div className="text-code text-warm-gray dark:text-manila-dark mb-1 flex min-w-0 items-center gap-1.5 px-1.5">
                <Folder aria-hidden size={14} />
                <span className="truncate font-mono" title={directory.path}>
                  {directory.path}
                </span>
              </div>
              <ul className="m-0 list-none space-y-0.5 p-0">
                {directory.files.map((file) => {
                  const active = file.path === selected.path;
                  const name = basename(file.path);

                  return (
                    <li key={file.path}>
                      <button
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        className={clsx(
                          'flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-xs px-1.5 py-1 text-left font-mono text-code',
                          active ? 'bg-orange text-faded-black' : 'intent:bg-manila-dark dark:intent:bg-warm-gray'
                        )}
                        title={file.path}
                        onClick={() => setSelectedPath(file.path)}
                      >
                        <FileCode2 aria-hidden className="shrink-0" size={14} />
                        <span className="truncate">{name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="bg-faded-black dark:bg-soot min-w-0">
          <div className="border-warm-gray text-manila-light flex min-h-11 items-center gap-2 border-b px-3">
            <FileCode2 aria-hidden className="shrink-0" size={16} />
            <span className="text-code min-w-0 flex-1 truncate font-mono" title={selected.path}>
              {selected.path}
            </span>
            <button
              type="button"
              className="text-code intent:bg-warm-gray flex cursor-pointer items-center gap-1.5 rounded-xs px-2 py-1"
              aria-label={`Copy ${selected.path}`}
              onClick={copy}
            >
              {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className={clsx(shared.pre, highlighted.preClassName, 'm-0 max-h-128 overflow-auto p-4')}>
            <code
              className={clsx(shared.codeBlock, highlighted.codeClassName)}
              dangerouslySetInnerHTML={{ __html: highlighted.html }}
            />
          </pre>
          <span className="sr-only" aria-live="polite">
            {copied ? `${selected.path} copied` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function SourceExplorerFallback() {
  return (
    <div className="border-manila-75 bg-manila-light dark:border-warm-gray dark:bg-soot my-6 min-h-80 animate-pulse rounded-xs border" />
  );
}

function groupByDirectory(files: readonly RegistrySourceFile[]): readonly Directory[] {
  const directories = new Map<string, RegistrySourceFile[]>();

  for (const file of files) {
    const directory = dirname(file.path);
    const entries = directories.get(directory) ?? [];

    entries.push(file);
    directories.set(directory, entries);
  }

  return [...directories].map(([path, entries]) => ({ files: entries, path }));
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function dirname(path: string): string {
  const index = path.lastIndexOf('/');

  return index === -1 ? '.' : path.slice(0, index);
}
