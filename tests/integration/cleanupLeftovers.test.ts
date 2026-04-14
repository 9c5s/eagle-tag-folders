import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  cleanupLeftovers,
  cleanupOldDirs,
  pruneOldDirs
} from '@/modules/folderExportSync/cleanupLeftovers';
import { MANAGED_SUBDIR } from '@/modules/folderExportSync/constants';

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'folder-export-cleanup-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('cleanupLeftovers', () => {
  it('staging と probe を削除、old は残す', async () => {
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.staging-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.probe-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-1`));
    await cleanupLeftovers(tmpRoot);
    const entries = await fs.readdir(tmpRoot);
    expect(entries.some((e) => e.includes('.staging-'))).toBe(false);
    expect(entries.some((e) => e.includes('.probe-'))).toBe(false);
    expect(entries.some((e) => e.includes('.old-'))).toBe(true);
  });

  it('rootDir が null なら何もしない', async () => {
    await expect(cleanupLeftovers(null)).resolves.not.toThrow();
  });
});

describe('cleanupOldDirs', () => {
  it('old を全て削除', async () => {
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-2`));
    const { removed, errors } = await cleanupOldDirs(tmpRoot);
    expect(removed).toHaveLength(2);
    expect(errors).toEqual([]);
  });

  it('staging や probe は削除しない (old のみ対象)', async () => {
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.staging-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.probe-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-1`));
    const { removed } = await cleanupOldDirs(tmpRoot);
    expect(removed).toHaveLength(1);
    const remaining = await fs.readdir(tmpRoot);
    expect(remaining.some((e) => e.includes('.staging-'))).toBe(true);
    expect(remaining.some((e) => e.includes('.probe-'))).toBe(true);
  });

  it('rootDir が存在しない → errors に記録', async () => {
    const { removed, errors } = await cleanupOldDirs(path.join(tmpRoot, 'missing'));
    expect(removed).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.kind).toBe('fatal');
  });
});

describe('pruneOldDirs', () => {
  it('keep に指定された old は残し、それ以外の old-* を削除する', async () => {
    const keep = path.join(tmpRoot, `${MANAGED_SUBDIR}.old-100`);
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-2`));
    await fs.mkdir(keep);
    await pruneOldDirs(tmpRoot, keep);
    const entries = await fs.readdir(tmpRoot);
    expect(entries).toContain(`${MANAGED_SUBDIR}.old-100`);
    expect(entries).not.toContain(`${MANAGED_SUBDIR}.old-1`);
    expect(entries).not.toContain(`${MANAGED_SUBDIR}.old-2`);
  });

  it('keep が null なら old-* を全削除する', async () => {
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-2`));
    await pruneOldDirs(tmpRoot, null);
    const entries = await fs.readdir(tmpRoot);
    expect(entries.some((e) => e.includes('.old-'))).toBe(false);
  });

  it('staging や probe は削除しない (old のみ対象)', async () => {
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.staging-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.probe-1`));
    await fs.mkdir(path.join(tmpRoot, `${MANAGED_SUBDIR}.old-1`));
    await pruneOldDirs(tmpRoot, null);
    const entries = await fs.readdir(tmpRoot);
    expect(entries.some((e) => e.includes('.staging-'))).toBe(true);
    expect(entries.some((e) => e.includes('.probe-'))).toBe(true);
    expect(entries.some((e) => e.includes('.old-'))).toBe(false);
  });

  it('rootDir が存在しない場合は何もしない (エラーを投げない)', async () => {
    await expect(pruneOldDirs(path.join(tmpRoot, 'missing'), null)).resolves.not.toThrow();
  });
});
