import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockEagle } from '../helpers/mockEagle';
import { collectItems } from '@/modules/folderExportSync/collectItems';
import { DEFAULT_SETTINGS } from '@/modules/folderExportSync/types';
import type { Settings } from '@/modules/folderExportSync/types';

const mkItem = (id: string, tags: string[] = [], folders: string[] = []) => ({
  id,
  name: id,
  ext: 'png',
  filePath: `/src/${id}.png`,
  tags,
  folders
});

const settings = (overrides?: Partial<Settings>): Settings => ({
  ...DEFAULT_SETTINGS,
  ...overrides
});

beforeEach(() => {
  mockEagle({
    item: {
      getAll: vi.fn(),
      getSelected: vi.fn(),
      get: vi.fn(),
      getById: vi.fn(),
      getByIds: vi.fn()
    } as unknown as Eagle.EagleAPI['item'],
    folder: {
      getAll: vi.fn().mockResolvedValue([{ id: 'F1', name: 'F-one', parent: null, children: [] }])
    } as unknown as Eagle.EagleAPI['folder'],
    smartFolder: {
      getAll: vi.fn().mockResolvedValue([])
    } as unknown as Eagle.EagleAPI['smartFolder']
  });
});

describe('collectItems', () => {
  it('all ON なら get() で全件一括取得する (fields 指定なし: filePath getter を有効化するため)', async () => {
    const get = vi.fn().mockResolvedValue([mkItem('i1', [], ['F1'])]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const result = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, all: true } })
    );
    expect(result.items).toHaveLength(1);
    expect(get).toHaveBeenCalledWith({});
  });

  it('all OFF + folders ON なら folders 指定で取得する (fields なし)', async () => {
    const get = vi.fn().mockResolvedValue([mkItem('i1', [], ['F1'])]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    await collectItems(settings());
    expect(get).toHaveBeenCalledWith({ folders: ['F1'] });
  });

  it('untagged ON なら isUntagged 取得を追加する (fields なし)', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce([mkItem('i1', ['a'], ['F1'])])
      .mockResolvedValueOnce([mkItem('i2', [], [])]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const r = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, untagged: true } })
    );
    expect(r.items.map((i) => i.id).sort()).toEqual(['i1', 'i2']);
    expect(get).toHaveBeenCalledWith({ isUntagged: true });
  });

  it('uncategorized ON なら isUnfiled 取得 + smartMatched 除外で判定', async () => {
    const unfiled = [mkItem('u1', [], []), mkItem('u2', [], [])];
    const get = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(unfiled);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const smartFolderGetAll = vi.fn().mockResolvedValue([
      {
        id: 'S1',
        name: 'S1',
        parent: null,
        children: [],
        getItems: vi.fn().mockResolvedValue([mkItem('u1', [], [])])
      }
    ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.smartFolder.getAll =
      smartFolderGetAll;
    const r = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, uncategorized: true } })
    );
    expect(r.uncategorizedItems.map((i) => i.id)).toEqual(['u2']);
  });

  it('all=true + uncategorized=true を両方 ON にしても uncategorized 判定が動く (regression)', async () => {
    const allItems = [mkItem('a1', ['t'], ['F1']), mkItem('u1', [], []), mkItem('u2', [], [])];
    const unfiled = [mkItem('u1', [], []), mkItem('u2', [], [])];
    const get = vi.fn().mockResolvedValueOnce(allItems).mockResolvedValueOnce(unfiled);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const smartFolderGetAll = vi.fn().mockResolvedValue([
      {
        id: 'S1',
        name: 'S1',
        parent: null,
        children: [],
        getItems: vi.fn().mockResolvedValue([mkItem('u1', [], [])])
      }
    ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.smartFolder.getAll =
      smartFolderGetAll;
    const r = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, all: true, uncategorized: true } })
    );
    expect(r.items.map((i) => i.id).sort()).toEqual(['a1', 'u1', 'u2']);
    expect(r.uncategorizedItems.map((i) => i.id)).toEqual(['u2']);
  });

  it('smart-folders=false + uncategorized=true でも sfItemsCache を構築する', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mkItem('u1')]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const sfGetItems = vi.fn().mockResolvedValue([]);
    const smartFolderGetAll = vi
      .fn()
      .mockResolvedValue([
        { id: 'S1', name: 'S1', parent: null, children: [], getItems: sfGetItems }
      ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.smartFolder.getAll =
      smartFolderGetAll;
    await collectItems(
      settings({
        categories: { ...DEFAULT_SETTINGS.categories, smartFolders: false, uncategorized: true }
      })
    );
    expect(sfGetItems).toHaveBeenCalledTimes(1);
  });

  it('除外フォルダは activeFolderIds から外れる', async () => {
    const folderGetAll = vi.fn().mockResolvedValue([
      {
        id: 'F1',
        name: 'F-one',
        parent: null,
        children: [{ id: 'F2', name: 'F-two', parent: 'F1', children: [] }]
      }
    ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.folder.getAll = folderGetAll;
    const get = vi.fn().mockResolvedValue([]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    await collectItems(settings({ excludedFolderIds: ['F1'] }));
    expect(get).not.toHaveBeenCalled();
  });
});
