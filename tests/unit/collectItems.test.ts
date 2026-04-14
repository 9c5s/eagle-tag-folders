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
  it('all ON: get({}) で全件取得しクライアント側で何もフィルタしない', async () => {
    const get = vi.fn().mockResolvedValue([mkItem('i1', [], ['F1'])]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const result = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, all: true } })
    );
    expect(result.items).toHaveLength(1);
    expect(get).toHaveBeenCalledWith({});
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('folders ON: get({}) で全件取得し folder 所属をクライアント側で判定する', async () => {
    const get = vi.fn().mockResolvedValue([
      mkItem('i1', [], ['F1']), // F1 に所属 → included
      mkItem('i2', [], ['F2']) // F2 は tree にないので excluded
    ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const r = await collectItems(settings());
    expect(r.items.map((i) => i.id)).toEqual(['i1']);
    expect(get).toHaveBeenCalledWith({});
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('untagged ON: 全件取得し tags.length===0 をクライアント側で抽出する', async () => {
    const get = vi.fn().mockResolvedValue([mkItem('i1', ['a'], ['F1']), mkItem('i2', [], [])]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const r = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, untagged: true } })
    );
    expect(r.items.map((i) => i.id).sort()).toEqual(['i1', 'i2']);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('uncategorized ON: folders.length===0 を isUnfiled とみなし sfItemsCache 差分を取る', async () => {
    const get = vi.fn().mockResolvedValue([
      mkItem('u1', [], []),
      mkItem('u2', [], []),
      mkItem('t1', ['x'], ['F1']) // 対象外
    ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const smartFolderGetAll = vi.fn().mockResolvedValue([
      {
        id: 'S1',
        name: 'S1',
        parent: null,
        children: [],
        getItems: vi.fn().mockResolvedValue([{ id: 'u1' }])
      }
    ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.smartFolder.getAll =
      smartFolderGetAll;
    const r = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, uncategorized: true } })
    );
    expect(r.uncategorizedItems.map((i) => i.id)).toEqual(['u2']);
  });

  it('all=true + uncategorized=true: 両方 ON でも get は 1 回、uncategorized 判定は正しく動く', async () => {
    const allItems = [mkItem('a1', ['t'], ['F1']), mkItem('u1', [], []), mkItem('u2', [], [])];
    const get = vi.fn().mockResolvedValue(allItems);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const smartFolderGetAll = vi.fn().mockResolvedValue([
      {
        id: 'S1',
        name: 'S1',
        parent: null,
        children: [],
        getItems: vi.fn().mockResolvedValue([{ id: 'u1' }])
      }
    ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.smartFolder.getAll =
      smartFolderGetAll;
    const r = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, all: true, uncategorized: true } })
    );
    expect(r.items.map((i) => i.id).sort()).toEqual(['a1', 'u1', 'u2']);
    expect(r.uncategorizedItems.map((i) => i.id)).toEqual(['u2']);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('smart-folders=false + uncategorized=true でも sfItemsCache を構築する', async () => {
    const get = vi.fn().mockResolvedValue([mkItem('u1', [], [])]);
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

  it('sf.getItems の結果から filePath 等を全件キャッシュで補完する', async () => {
    const get = vi.fn().mockResolvedValue([mkItem('i1', [], ['F1'])]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const sfGetItems = vi.fn().mockResolvedValue([{ id: 'i1' }]); // filePath なしの light item
    const smartFolderGetAll = vi
      .fn()
      .mockResolvedValue([
        { id: 'S1', name: 'S1', parent: null, children: [], getItems: sfGetItems }
      ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.smartFolder.getAll =
      smartFolderGetAll;
    const r = await collectItems(
      settings({ categories: { ...DEFAULT_SETTINGS.categories, smartFolders: true } })
    );
    const cached = r.sfItemsCache.get('S1');
    expect(cached).toBeDefined();
    expect(cached![0]!.filePath).toBe('/src/i1.png'); // 全件キャッシュから補完される
  });

  it('除外フォルダ指定で activeFolderIds が空になっても get は呼ばれ、items は空になる', async () => {
    const folderGetAll = vi.fn().mockResolvedValue([
      {
        id: 'F1',
        name: 'F-one',
        parent: null,
        children: [{ id: 'F2', name: 'F-two', parent: 'F1', children: [] }]
      }
    ]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.folder.getAll = folderGetAll;
    const get = vi.fn().mockResolvedValue([mkItem('i1', [], ['F1']), mkItem('i2', [], ['F2'])]);
    (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle.item.get =
      get as unknown as Eagle.EagleAPI['item']['get'];
    const r = await collectItems(settings({ excludedFolderIds: ['F1'] }));
    expect(get).toHaveBeenCalledTimes(1);
    expect(r.items).toHaveLength(0);
  });
});
