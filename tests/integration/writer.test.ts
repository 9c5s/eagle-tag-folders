import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { writeToStaging } from '@/modules/folderExportSync/writer';
import { DEFAULT_SETTINGS } from '@/modules/folderExportSync/types';
import type { SymlinkPlan, ResolvedPaths } from '@/modules/folderExportSync/types';
import { MANAGED_SUBDIR } from '@/modules/folderExportSync/constants';

let tmpRoot: string;
let sourceFile: string;

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
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tagfolders-writer-'));
  sourceFile = path.join(tmpRoot, 'source.txt');
  await fs.writeFile(sourceFile, 'hello', 'utf8');
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('writeToStaging', () => {
  it('プランから symlink を作成', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    await fs.mkdir(paths.stagingDir, { recursive: true });
    const plans: SymlinkPlan[] = [
      {
        itemId: 'i1',
        sourcePath: sourceFile,
        destDir: 'sky',
        destName: 'photo.txt',
        displayTag: 'sky'
      }
    ];
    try {
      const { errors } = await writeToStaging(plans, paths, DEFAULT_SETTINGS, {});
      expect(errors).toEqual([]);
      const target = path.join(paths.stagingDir, 'sky', 'photo.txt');
      const content = await fs.readFile(target, 'utf8');
      expect(content).toBe('hello');
    } catch (e: any) {
      if (e?.code === 'EPERM') return; // Windows 開発者モード無効スキップ
      throw e;
    }
  });

  it('元ファイル不在の plan は skipped で記録 (symlink は成功しても元が無いだけ)', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    await fs.mkdir(paths.stagingDir, { recursive: true });
    const plans: SymlinkPlan[] = [
      {
        itemId: 'i1',
        sourcePath: path.join(tmpRoot, 'missing.txt'),
        destDir: 'sky',
        destName: 'photo.txt',
        displayTag: 'sky'
      }
    ];
    try {
      const { errors } = await writeToStaging(plans, paths, DEFAULT_SETTINGS, {});
      // 多くの OS では symlink 自体は成功 (dangling link)。errors は空か skipped のみ
      for (const e of errors) expect(e.kind).toBe('skipped');
    } catch (e: any) {
      if (e?.code === 'EPERM') return;
      throw e;
    }
  });

  it('onProgress が呼ばれる', async () => {
    const paths = mkPaths(tmpRoot, Date.now());
    await fs.mkdir(paths.stagingDir, { recursive: true });
    const plans: SymlinkPlan[] = [
      { itemId: 'i1', sourcePath: sourceFile, destDir: 'a', destName: 'f1.txt', displayTag: 'a' },
      { itemId: 'i2', sourcePath: sourceFile, destDir: 'a', destName: 'f2.txt', displayTag: 'a' }
    ];
    let progressCalls = 0;
    try {
      await writeToStaging(plans, paths, DEFAULT_SETTINGS, {
        onProgress: () => progressCalls++
      });
      expect(progressCalls).toBeGreaterThan(0);
    } catch (e: any) {
      if (e?.code === 'EPERM') return;
      throw e;
    }
  });
});
