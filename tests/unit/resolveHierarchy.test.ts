import { describe, it, expect } from 'vitest';
import {
  buildFolderPairs,
  buildSmartFolderPairs,
  buildFlatPairs
} from '@/modules/folderExportSync/resolveHierarchy';
import type { EagleItem } from '@/modules/folderExportSync/types';

type FolderNode = { id: string; name: string; parent: string | null; children: FolderNode[] };

const item = (id: string, folders: string[] = [], tags: string[] = []): EagleItem => ({
  id,
  name: id,
  ext: 'png',
  filePath: `/src/${id}.png`,
  tags,
  folders
});

describe('buildFolderPairs', () => {
  const tree: FolderNode[] = [
    {
      id: 'A',
      name: 'Alpha',
      parent: null,
      children: [{ id: 'A1', name: 'A-one', parent: 'A', children: [] }]
    },
    { id: 'B', name: 'Bravo', parent: null, children: [] }
  ];
  const items: EagleItem[] = [
    item('i1', ['A']),
    item('i2', ['A', 'A1']),
    item('i3', ['B']),
    item('i4', [])
  ];

  it('アイテムを所属フォルダ階層に配置する', () => {
    const pairs = buildFolderPairs(tree, items, new Set(), ['folders']);
    const sigs = pairs.map((p) => `${p.dir.join('/')}|${p.item.id}`).sort();
    expect(sigs).toEqual([
      'folders/Alpha/A-one|i2',
      'folders/Alpha|i1',
      'folders/Alpha|i2',
      'folders/Bravo|i3'
    ]);
  });

  it('除外サブツリーは出力しない', () => {
    const pairs = buildFolderPairs(tree, items, new Set(['A']), ['folders']);
    expect(pairs.map((p) => p.item.id).sort()).toEqual(['i3']);
  });

  it('アイテム 0 件のフォルダは pair を生成しない (空スキップ)', () => {
    const pairs = buildFolderPairs(tree, [item('x', ['A1'])], new Set(), ['folders']);
    // A には直接所属がないので pair が出ない。A1 だけ出る。
    expect(pairs.map((p) => p.dir.join('/'))).toEqual(['folders/Alpha/A-one']);
  });
});

describe('buildSmartFolderPairs', () => {
  type SFNode = { id: string; name: string; parent: string | null; children: SFNode[] };
  const tree: SFNode[] = [
    {
      id: 'S',
      name: 'Sigma',
      parent: null,
      children: [{ id: 'S1', name: 'S-one', parent: 'S', children: [] }]
    }
  ];
  const cache = new Map<string, EagleItem[]>([
    ['S', [item('i1', [])]],
    ['S1', [item('i2', []), item('i3', [])]]
  ]);

  it('キャッシュからスマートフォルダ配下に配置', () => {
    const pairs = buildSmartFolderPairs(tree, cache, new Set(), ['smart-folders']);
    const sigs = pairs.map((p) => `${p.dir.join('/')}|${p.item.id}`).sort();
    expect(sigs).toEqual([
      'smart-folders/Sigma/S-one|i2',
      'smart-folders/Sigma/S-one|i3',
      'smart-folders/Sigma|i1'
    ]);
  });

  it('除外スマートフォルダ配下は出さない', () => {
    const pairs = buildSmartFolderPairs(tree, cache, new Set(['S1']), ['smart-folders']);
    expect(pairs.map((p) => p.item.id).sort()).toEqual(['i1']);
  });
});

describe('buildFlatPairs', () => {
  it('全アイテムを単一ディレクトリに並べる', () => {
    const items: EagleItem[] = [item('i1'), item('i2')];
    const pairs = buildFlatPairs(items, ['all']);
    expect(pairs).toEqual([
      { item: items[0], dir: ['all'] },
      { item: items[1], dir: ['all'] }
    ]);
  });

  it('空配列なら空配列を返す (空スキップ)', () => {
    expect(buildFlatPairs([], ['all'])).toEqual([]);
  });
});
