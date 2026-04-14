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

/**
 * orchestrator 統合テストの共通 mockEagle 呼び出し。
 * folder/smartFolder は mockEagle のデフォルトに含まれていないため、
 * 各テストでこのヘルパー経由で必ず stub を注入する。
 */
function setupEagleMock(opts?: {
  items?: Array<{
    id: string;
    name: string;
    ext: string;
    filePath: string;
    tags: string[];
    folders: string[];
  }>;
  folders?: Array<{
    id: string;
    name: string;
    parent: string | null;
    children: unknown[];
  }>;
  smartFolders?: Array<{
    id: string;
    name: string;
    parent: string | null;
    children: unknown[];
    getItems?: ReturnType<typeof vi.fn>;
  }>;
  locale?: string;
}) {
  mockEagle({
    item: {
      getAll: vi.fn(),
      getSelected: vi.fn(),
      get: vi.fn().mockResolvedValue(opts?.items ?? []),
      getById: vi.fn(),
      getByIds: vi.fn()
    } as unknown as Eagle.EagleAPI['item'],
    folder: {
      getAll: vi.fn().mockResolvedValue(opts?.folders ?? [])
    } as unknown as Eagle.EagleAPI['folder'],
    smartFolder: {
      getAll: vi.fn().mockResolvedValue(opts?.smartFolders ?? [])
    } as unknown as Eagle.EagleAPI['smartFolder'],
    library: { path: libraryDir, name: 'test', info: vi.fn() },
    app: {
      theme: 'LIGHT',
      locale: opts?.locale ?? 'en_US',
      isDarkColors: () => false
    } as unknown as Eagle.App
  });
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'folder-export-orch-'));
  libraryDir = path.join(tmpRoot, 'library');
  await fs.mkdir(libraryDir);
  sourceFile = path.join(libraryDir, 'src.txt');
  await fs.writeFile(sourceFile, 'hello');
  setupEagleMock({
    items: [
      {
        id: 'i1',
        name: 'photo',
        ext: 'txt',
        filePath: sourceFile,
        tags: ['sky'],
        folders: ['F1']
      }
    ],
    folders: [{ id: 'F1', name: 'Folder 1', parent: null, children: [] }]
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
  it('buildPlan → execute で managedDir にフォルダ階層配下のリンクが作られる', async () => {
    const rootDir = path.join(tmpRoot, 'out');
    await fs.mkdir(rootDir);
    const settings = { ...DEFAULT_SETTINGS, rootDir };
    const { plans } = await buildPlan(settings);
    try {
      const result = await execute(plans, settings, {});
      expect(result.success).toBe(true);
      expect(result.rolledBack).toBe(false);
      const target = path.join(rootDir, MANAGED_SUBDIR, 'folders', 'Folder 1', 'photo.txt');
      const content = await fs.readFile(target, 'utf8');
      expect(content).toBe('hello');
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === 'EPERM') return;
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
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === 'EPERM') return;
      throw e;
    }
  });

  it('execute 成功後に前世代の .old-* ディレクトリが削除される (1 世代のみ保持)', async () => {
    const rootDir = path.join(tmpRoot, 'prune');
    await fs.mkdir(rootDir);
    await fs.mkdir(path.join(rootDir, `${MANAGED_SUBDIR}.old-1`));
    await fs.mkdir(path.join(rootDir, `${MANAGED_SUBDIR}.old-2`));
    const settings = { ...DEFAULT_SETTINGS, rootDir };
    const { plans } = await buildPlan(settings);
    try {
      const result = await execute(plans, settings, {});
      if (!result.success) return;
      const entries = await fs.readdir(rootDir);
      // 初回同期なので今回の oldDir は作られない (managed が元から無いため)
      expect(entries.some((e) => e.startsWith(`${MANAGED_SUBDIR}.old-`))).toBe(false);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === 'EPERM') return;
      throw e;
    }
  });
});

describe('buildPlan カテゴリ別の挙動', () => {
  it('categories.folders=true でフォルダ階層が plan に反映される', async () => {
    setupEagleMock({
      items: [
        {
          id: 'i1',
          name: 'photo',
          ext: 'txt',
          filePath: sourceFile,
          tags: [],
          folders: ['F1']
        }
      ],
      folders: [{ id: 'F1', name: 'Folder 1', parent: null, children: [] }]
    });
    const rootDir = path.join(tmpRoot, 'fold-test');
    await fs.mkdir(rootDir);
    const settings = {
      ...DEFAULT_SETTINGS,
      rootDir,
      categories: {
        folders: true,
        smartFolders: false,
        all: false,
        untagged: false,
        uncategorized: false
      }
    };
    const { plans, summary } = await buildPlan(settings);
    expect(plans).toHaveLength(1);
    expect(plans[0]!.destDir).toBe('folders/Folder 1');
    expect(summary.folderCount).toBe(1);
  });

  it('categories.all=true で all/ 配下にフラット配置される', async () => {
    setupEagleMock({
      items: [
        {
          id: 'i1',
          name: 'a',
          ext: 'txt',
          filePath: sourceFile,
          tags: [],
          folders: []
        },
        {
          id: 'i2',
          name: 'b',
          ext: 'txt',
          filePath: sourceFile,
          tags: ['x'],
          folders: ['F1']
        }
      ],
      folders: [{ id: 'F1', name: 'Folder 1', parent: null, children: [] }]
    });
    const rootDir = path.join(tmpRoot, 'all-test');
    await fs.mkdir(rootDir);
    const settings = {
      ...DEFAULT_SETTINGS,
      rootDir,
      categories: {
        folders: false,
        smartFolders: false,
        all: true,
        untagged: false,
        uncategorized: false
      }
    };
    const { plans } = await buildPlan(settings);
    expect(plans).toHaveLength(2);
    expect(new Set(plans.map((p) => p.destDir))).toEqual(new Set(['all']));
  });

  it('excludedFolderIds で該当フォルダのアイテムが出力から外れる', async () => {
    setupEagleMock({
      items: [],
      folders: [
        {
          id: 'F1',
          name: 'Folder 1',
          parent: null,
          children: [{ id: 'F2', name: 'Folder 2', parent: 'F1', children: [] }]
        }
      ]
    });
    const rootDir = path.join(tmpRoot, 'excl-test');
    await fs.mkdir(rootDir);
    const settings = {
      ...DEFAULT_SETTINGS,
      rootDir,
      categories: {
        folders: true,
        smartFolders: false,
        all: false,
        untagged: false,
        uncategorized: false
      },
      excludedFolderIds: ['F1']
    };
    const { plans, summary } = await buildPlan(settings);
    expect(plans).toHaveLength(0);
    expect(summary.excludedFolderCount).toBe(2);
  });

  it("eagle.app.locale='ja_JP' でディレクトリ名が日本語になる", async () => {
    setupEagleMock({
      items: [
        {
          id: 'i1',
          name: 'photo',
          ext: 'txt',
          filePath: sourceFile,
          tags: [],
          folders: ['F1']
        }
      ],
      folders: [{ id: 'F1', name: 'Folder 1', parent: null, children: [] }],
      locale: 'ja_JP'
    });
    const rootDir = path.join(tmpRoot, 'ja-test');
    await fs.mkdir(rootDir);
    const settings = {
      ...DEFAULT_SETTINGS,
      rootDir,
      categories: {
        folders: true,
        smartFolders: false,
        all: false,
        untagged: false,
        uncategorized: false
      }
    };
    const { plans } = await buildPlan(settings);
    expect(plans).toHaveLength(1);
    expect(plans[0]!.destDir.startsWith('フォルダ/')).toBe(true);
  });
});
