import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { mockEagle } from '../helpers/mockEagle';
import { buildPlan, execute, validatePrerequisites } from '@/modules/folderExportSync/orchestrator';
import { DEFAULT_SETTINGS } from '@/modules/folderExportSync/types';
import { MANAGED_SUBDIR } from '@/modules/folderExportSync/constants';

let tmpRoot: string;
let libraryDir: string;
let sourceFile: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tagfolders-orch-'));
  libraryDir = path.join(tmpRoot, 'library');
  await fs.mkdir(libraryDir);
  sourceFile = path.join(libraryDir, 'src.txt');
  await fs.writeFile(sourceFile, 'hello');
  mockEagle({
    item: {
      getAll: vi.fn(),
      getSelected: vi.fn(),
      get: vi.fn().mockResolvedValue([
        {
          id: 'i1',
          name: 'photo',
          ext: 'txt',
          filePath: sourceFile,
          tags: ['sky'],
          folders: []
        }
      ]),
      getById: vi.fn(),
      getByIds: vi.fn()
    } as unknown as Eagle.EagleAPI['item'],
    library: { path: libraryDir, name: 'test', info: vi.fn() }
  });
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('validatePrerequisites', () => {
  it('rootDir が null なら fatal throw', async () => {
    await expect(validatePrerequisites({ ...DEFAULT_SETTINGS })).rejects.toThrow();
  });
  it('rootDir が存在しない → fatal throw', async () => {
    const settings = { ...DEFAULT_SETTINGS, rootDir: path.join(tmpRoot, 'missing') };
    await expect(validatePrerequisites(settings)).rejects.toThrow();
  });
  it('rootDir が library と同一 → fatal throw', async () => {
    const settings = { ...DEFAULT_SETTINGS, rootDir: libraryDir };
    await expect(validatePrerequisites(settings)).rejects.toThrow();
  });
});

describe('orchestrator E2E', () => {
  it('buildPlan → execute で managedDir にリンクが作られる', async () => {
    const rootDir = path.join(tmpRoot, 'out');
    await fs.mkdir(rootDir);
    const settings = { ...DEFAULT_SETTINGS, rootDir };
    const { plans } = await buildPlan(settings);
    try {
      const result = await execute(plans, settings, {});
      expect(result.success).toBe(true);
      expect(result.rolledBack).toBe(false);
      const target = path.join(rootDir, MANAGED_SUBDIR, 'sky', 'photo.txt');
      const content = await fs.readFile(target, 'utf8');
      expect(content).toBe('hello');
    } catch (e: any) {
      if (e?.code === 'EPERM') return;
      throw e;
    }
  });

  it('phase 発火順: validate → write → swap → done', async () => {
    const rootDir = path.join(tmpRoot, 'out2');
    await fs.mkdir(rootDir);
    const settings = { ...DEFAULT_SETTINGS, rootDir };
    const { plans } = await buildPlan(settings);
    const phases: string[] = [];
    try {
      await execute(plans, settings, { onPhaseChange: (p) => phases.push(p) });
      expect(phases).toEqual(['validate', 'write', 'swap', 'done']);
    } catch (e: any) {
      if (e?.code === 'EPERM') return;
      throw e;
    }
  });
});
