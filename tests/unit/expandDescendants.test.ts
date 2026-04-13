import { describe, it, expect } from 'vitest';
import { expandDescendants } from '@/modules/folderExportSync/expandDescendants';

type N = { id: string; children: N[] };

const tree: N[] = [
  {
    id: 'A',
    children: [
      { id: 'A1', children: [{ id: 'A1a', children: [] }] },
      { id: 'A2', children: [] }
    ]
  },
  { id: 'B', children: [] }
];

describe('expandDescendants', () => {
  it('ルート指定で子孫まで含む Set を返す', () => {
    expect(expandDescendants(tree, ['A'])).toEqual(new Set(['A', 'A1', 'A1a', 'A2']));
  });

  it('子指定で親は含まない', () => {
    expect(expandDescendants(tree, ['A1'])).toEqual(new Set(['A1', 'A1a']));
  });

  it('存在しない ID は無視', () => {
    expect(expandDescendants(tree, ['X'])).toEqual(new Set());
  });

  it('空指定で空 Set', () => {
    expect(expandDescendants(tree, [])).toEqual(new Set());
  });

  it('重複指定はユニーク化される', () => {
    expect(expandDescendants(tree, ['A', 'A1'])).toEqual(new Set(['A', 'A1', 'A1a', 'A2']));
  });
});
