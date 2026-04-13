import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  writeMarker,
  isManaged,
  assertNotReparsePoint,
  MARKER_FILE
} from '@/modules/tagFolderSync/marker';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tagfolders-marker-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('marker', () => {
  it('writeMarker + isManaged = true', async () => {
    await writeMarker(tmpDir, { version: '1.0.0', createdAt: 'now', pluginId: 'p1' });
    expect(await isManaged(tmpDir)).toBe(true);
  });

  it('目印なし → isManaged = false', async () => {
    expect(await isManaged(tmpDir)).toBe(false);
  });

  it('目印が壊れた JSON → false', async () => {
    await fs.writeFile(path.join(tmpDir, MARKER_FILE), '{{broken');
    expect(await isManaged(tmpDir)).toBe(false);
  });

  it('assertNotReparsePoint: 通常ディレクトリは OK', async () => {
    await expect(assertNotReparsePoint(tmpDir)).resolves.not.toThrow();
  });

  it('assertNotReparsePoint: シンボリックリンクは拒否', async () => {
    const link = path.join(tmpDir, 'link');
    const real = path.join(tmpDir, 'real');
    await fs.mkdir(real);
    try {
      await fs.symlink(real, link, 'dir');
    } catch {
      return; // Windows 開発者モード無効時はスキップ
    }
    await expect(assertNotReparsePoint(link)).rejects.toThrow();
  });
});
