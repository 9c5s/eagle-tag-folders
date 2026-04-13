import { describe, it, expect } from 'vitest';
import { resolveDirectories, resolveAllPaths } from '@/modules/folderExportSync/resolveFolder';
import type { EagleItem, EagleTagGroup } from '@/modules/folderExportSync/types';

describe('resolveDirectories', () => {
  it('未所属タグは [tag]', () => {
    const map = new Map<string, string[]>();
    expect(resolveDirectories('sky', map)).toEqual(['sky']);
  });
  it('1 グループ所属は [group/tag]', () => {
    const map = new Map([['sky', ['Nature']]]);
    expect(resolveDirectories('sky', map)).toEqual(['Nature/sky']);
  });
  it('複数グループ所属は複数パス', () => {
    const map = new Map([['sky', ['Nature', 'Colors']]]);
    expect(resolveDirectories('sky', map)).toEqual(['Nature/sky', 'Colors/sky']);
  });
});

describe('resolveAllPaths', () => {
  const group: EagleTagGroup = { name: 'Colors', tags: ['blue'] };
  const item = (id: string, tags: string[]): EagleItem => ({
    id,
    name: id,
    ext: 'png',
    filePath: '/src/' + id,
    tags
  });

  it('アイテム × タグ × グループ展開', () => {
    const result = resolveAllPaths([item('a', ['blue', 'sky'])], [group]);
    const dirs = result.map((r) => r.dir).sort();
    expect(dirs).toEqual(['Colors/blue', 'sky']);
  });
  it('タグ無しアイテムはスキップ', () => {
    const result = resolveAllPaths([item('a', [])], [group]);
    expect(result).toEqual([]);
  });
});
