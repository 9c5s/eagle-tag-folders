import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  probeSymlinkCapability,
  type FsOps
} from '@/modules/folderExportSync/probeSymlinkCapability';
import type { ResolvedPaths } from '@/modules/folderExportSync/types';
import { MANAGED_SUBDIR } from '@/modules/folderExportSync/constants';

let tmpRoot: string;
let existingFile: string;

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
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'folder-export-probe-'));
  existingFile = path.join(tmpRoot, 'existing-file.txt');
  await fs.writeFile(existingFile, 'x', 'utf8');
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('probeSymlinkCapability', () => {
  it('成功なら probe を cleanup', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    try {
      await probeSymlinkCapability(paths, existingFile);
    } catch (e: any) {
      if (e?.code === 'EPERM') return; // Windows 開発者モード無効時スキップ
      throw e;
    }
    const exists = await fs
      .access(paths.probeDir)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  it('fs.symlink が EPERM を throw → probeDir を cleanup して再 throw', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    const ePerm: NodeJS.ErrnoException = Object.assign(new Error('EPERM'), { code: 'EPERM' });
    const mockOps: FsOps = {
      ...fs,
      symlink: vi.fn().mockRejectedValueOnce(ePerm)
    };

    await expect(probeSymlinkCapability(paths, existingFile, mockOps)).rejects.toMatchObject({
      code: 'EPERM'
    });

    const probeExists = await fs
      .access(paths.probeDir)
      .then(() => true)
      .catch(() => false);
    expect(probeExists).toBe(false);
  });

  it('存在しないファイルを渡すと ENOENT', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    await expect(
      probeSymlinkCapability(paths, path.join(tmpRoot, 'missing'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('cleanup 失敗 (fs.rm が EBUSY) は warning のみ、fatal 化しない', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    const eBusy: NodeJS.ErrnoException = Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
    const mockOps: FsOps = {
      ...fs,
      rm: vi.fn().mockRejectedValueOnce(eBusy)
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await probeSymlinkCapability(paths, existingFile, mockOps);
      expect(warnSpy).toHaveBeenCalled();
    } catch (e: any) {
      if (e?.code === 'EPERM') return; // Windows 開発者モード無効時スキップ
      throw e;
    } finally {
      warnSpy.mockRestore();
    }
  });
});
