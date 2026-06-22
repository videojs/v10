import { compileProject } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import config from '../../../skins.compiler.config';

const compact = (value: string): string => value.replace(/\s+/g, '');

describe('skins compiler config', () => {
  it('lowers the default video source skin to a React Tailwind slice', async () => {
    const result = await compileProject(config);
    const output = result.files.find(
      (file) => file.type === 'chunk' && file.fileName.endsWith('default-video.generated.tailwind.tsx')
    );

    expect(result.diagnostics).toEqual([]);
    expect(output).toBeDefined();
    const code = output!.source;

    expect(code).not.toContain('@videojs/core/components');
    expect(code).not.toContain('@videojs/icons/components');
    expect(code).not.toContain('./tailwind/video.tailwind');
    expect(code).toContain('from "@videojs/skins/default/tailwind/video.tailwind"');
    expect(code).toContain('from "@videojs/utils/style"');
    expect(code).toContain('from "@/player/context"');
    expect(code).toContain('from "@/ui/airplay-button"');
    expect(code).toContain('from "@/ui/pip-button"');
    expect(code).toContain('from "@/ui/play-button"');
    expect(code).toContain('from "@/icons"');
    expect(code).toContain('import type { ReactNode } from "react"');

    const compactCode = compact(code);
    expect(compactCode).toContain(compact('children?: ReactNode | undefined;'));
    expect(compactCode).toContain(compact('<Container className={cn(container, className)}>'));
    expect(compactCode).toContain(compact('<Controls.Root className={controls} data-controls="">'));
    expect(compactCode).toContain(compact('<Tooltip.Trigger render={<PlayButton'));
    expect(compactCode).not.toContain('className={[');
  });
});
