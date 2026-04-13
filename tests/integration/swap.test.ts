import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { atomicSwap } from '@/modules/folderExportSync/swap';
import type { ResolvedPaths } from '@/modules/folderExportSync/types';
import { MANAGED_SUBDIR } from '@/modules/folderExportSync/constants';

let tmpRoot: string;

function mkPaths(rootDir: string, ts: number): ResolvedPaths {
  return {
    rootDir,
    managedDir: path.join(rootDir, MANAGED_SUBDIR),
    stagingDir: path.join(rootDir, `${MANAGED_SUBDIR}.staging-${ts}`),
    oldDir: path.join(rootDir, `${MANAGED_SUBDIR}.old-${ts}`),
    probeDir: path.join(rootDir, `${MANAGED_SUBDIR}.probe-${ts}`)
  };
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tagfolders-swap-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('atomicSwap', () => {
  it('managedDir 不存在時は staging を直接 rename', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    await fs.mkdir(paths.stagingDir, { recursive: true });
    await fs.writeFile(path.join(paths.stagingDir, 'test.txt'), 'x');
    const { oldDir } = await atomicSwap(paths);
    expect(oldDir).toBeNull();
    const exists = await fs.stat(paths.managedDir);
    expect(exists.isDirectory()).toBe(true);
  });

  it('既存 managedDir は oldDir に退避', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    await fs.mkdir(paths.managedDir, { recursive: true });
    await fs.writeFile(path.join(paths.managedDir, 'old.txt'), 'old');
    await fs.mkdir(paths.stagingDir, { recursive: true });
    await fs.writeFile(path.join(paths.stagingDir, 'new.txt'), 'new');
    const { oldDir } = await atomicSwap(paths);
    expect(oldDir).toBe(paths.oldDir);
    const oldContent = await fs.readFile(path.join(paths.oldDir, 'old.txt'), 'utf8');
    expect(oldContent).toBe('old');
    const newContent = await fs.readFile(path.join(paths.managedDir, 'new.txt'), 'utf8');
    expect(newContent).toBe('new');
  });
});
