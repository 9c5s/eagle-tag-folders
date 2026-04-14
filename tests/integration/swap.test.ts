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
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'folder-export-swap-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('moveDirectoryContents', () => {
  it('from の中身を 1 エントリずつ to に移動し、from は削除される', async () => {
    const { moveDirectoryContents } = await import('@/modules/folderExportSync/swap');
    const from = path.join(tmpRoot, 'src-dir');
    const to = path.join(tmpRoot, 'dst-dir');
    await fs.mkdir(from, { recursive: true });
    await fs.writeFile(path.join(from, 'a.txt'), 'A');
    await fs.writeFile(path.join(from, 'b.txt'), 'B');
    await fs.mkdir(path.join(from, 'sub'));
    await fs.writeFile(path.join(from, 'sub', 'c.txt'), 'C');

    await moveDirectoryContents(from, to);

    expect(await fs.readFile(path.join(to, 'a.txt'), 'utf8')).toBe('A');
    expect(await fs.readFile(path.join(to, 'b.txt'), 'utf8')).toBe('B');
    expect(await fs.readFile(path.join(to, 'sub', 'c.txt'), 'utf8')).toBe('C');
    // 元のディレクトリは削除される
    const fromExists = await fs
      .stat(from)
      .then(() => true)
      .catch(() => false);
    expect(fromExists).toBe(false);
  });

  it('to が存在しなくても mkdir して移動する', async () => {
    const { moveDirectoryContents } = await import('@/modules/folderExportSync/swap');
    const from = path.join(tmpRoot, 'src2');
    const to = path.join(tmpRoot, 'nested', 'dst2');
    await fs.mkdir(from, { recursive: true });
    await fs.writeFile(path.join(from, 'x.txt'), 'X');

    await moveDirectoryContents(from, to);

    expect(await fs.readFile(path.join(to, 'x.txt'), 'utf8')).toBe('X');
  });
});

describe('retryOnTransientFsError', () => {
  it('EPERM を 1 回投げても 2 回目で成功すれば結果を返す', async () => {
    const { retryOnTransientFsError } = await import('@/modules/folderExportSync/swap');
    let count = 0;
    const result = await retryOnTransientFsError(
      async () => {
        count++;
        if (count === 1) {
          const err = new Error('EPERM') as NodeJS.ErrnoException;
          err.code = 'EPERM';
          throw err;
        }
        return 'ok';
      },
      { attempts: 3, delayMs: 1 }
    );
    expect(result).toBe('ok');
    expect(count).toBe(2);
  });

  it('EBUSY もリトライ対象', async () => {
    const { retryOnTransientFsError } = await import('@/modules/folderExportSync/swap');
    let count = 0;
    const result = await retryOnTransientFsError(
      async () => {
        count++;
        if (count < 3) {
          const err = new Error('EBUSY') as NodeJS.ErrnoException;
          err.code = 'EBUSY';
          throw err;
        }
        return 'ok';
      },
      { attempts: 5, delayMs: 1 }
    );
    expect(result).toBe('ok');
    expect(count).toBe(3);
  });

  it('リトライ対象外 (ENOENT) は即 throw', async () => {
    const { retryOnTransientFsError } = await import('@/modules/folderExportSync/swap');
    let count = 0;
    await expect(
      retryOnTransientFsError(
        async () => {
          count++;
          const err = new Error('ENOENT') as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          throw err;
        },
        { attempts: 3, delayMs: 1 }
      )
    ).rejects.toThrow('ENOENT');
    expect(count).toBe(1);
  });

  it('attempts 回数を超えたら最後のエラーを throw', async () => {
    const { retryOnTransientFsError } = await import('@/modules/folderExportSync/swap');
    let count = 0;
    await expect(
      retryOnTransientFsError(
        async () => {
          count++;
          const err = new Error('EPERM') as NodeJS.ErrnoException;
          err.code = 'EPERM';
          throw err;
        },
        { attempts: 3, delayMs: 1 }
      )
    ).rejects.toThrow('EPERM');
    expect(count).toBe(3);
  });
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
