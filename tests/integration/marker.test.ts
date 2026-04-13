import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  writeMarker,
  isManaged,
  assertNotReparsePoint,
  MARKER_FILE
} from '@/modules/folderExportSync/marker';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'marker-'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
});

describe('writeMarker / isManaged', () => {
  it('schemaVersion 2 形式で書き込める', async () => {
    await writeMarker(tmp, {
      schemaVersion: 2,
      pluginId: 'pid-xyz',
      pluginVersion: '0.1.0',
      managedAt: '2026-04-14T00:00:00.000Z',
      locale: 'ja_JP',
      categories: {
        folders: true,
        smartFolders: true,
        all: false,
        untagged: false,
        uncategorized: false
      }
    });
    const raw = await fs.readFile(path.join(tmp, MARKER_FILE), 'utf8');
    const obj = JSON.parse(raw);
    expect(obj.schemaVersion).toBe(2);
    expect(obj.pluginId).toBe('pid-xyz');
    expect(obj.categories.folders).toBe(true);
  });

  it('isManaged は pluginId が文字列なら true', async () => {
    await fs.writeFile(path.join(tmp, MARKER_FILE), JSON.stringify({ pluginId: 'anything' }));
    expect(await isManaged(tmp)).toBe(true);
  });

  it('isManaged は MARKER が無ければ false', async () => {
    expect(await isManaged(tmp)).toBe(false);
  });
});

describe('assertNotReparsePoint', () => {
  it('通常ディレクトリは OK', async () => {
    await expect(assertNotReparsePoint(tmp)).resolves.not.toThrow();
  });

  it('シンボリックリンクは拒否', async () => {
    const link = path.join(tmp, 'link');
    const real = path.join(tmp, 'real');
    await fs.mkdir(real);
    try {
      await fs.symlink(real, link, 'dir');
    } catch {
      return; // Windows 開発者モード無効時はスキップ
    }
    await expect(assertNotReparsePoint(link)).rejects.toThrow();
  });
});
