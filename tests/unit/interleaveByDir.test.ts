import { describe, it, expect } from 'vitest';
import { interleaveByDir } from '@/modules/tagFolderSync/interleaveByDir';
import type { SymlinkPlan } from '@/modules/tagFolderSync/types';

function mk(dir: string, name: string): SymlinkPlan {
  return {
    itemId: name,
    sourcePath: '/src/' + name,
    destDir: dir,
    destName: name,
    displayTag: dir
  };
}

describe('interleaveByDir', () => {
  it('単一 dir はそのまま', () => {
    const plans = [mk('a', '1'), mk('a', '2'), mk('a', '3')];
    expect(interleaveByDir(plans).map((p) => p.destName)).toEqual(['1', '2', '3']);
  });
  it('2 dir を交互に並べる', () => {
    const plans = [mk('a', '1'), mk('a', '2'), mk('b', 'x'), mk('b', 'y')];
    expect(interleaveByDir(plans).map((p) => p.destName)).toEqual(['1', 'x', '2', 'y']);
  });
  it('長さが異なる dir も混在', () => {
    const plans = [mk('a', '1'), mk('a', '2'), mk('a', '3'), mk('b', 'x')];
    expect(interleaveByDir(plans).map((p) => p.destName)).toEqual(['1', 'x', '2', '3']);
  });
  it('同じ入力に対して決定論的', () => {
    const plans = [mk('a', '1'), mk('b', 'x'), mk('a', '2')];
    expect(interleaveByDir(plans)).toEqual(interleaveByDir(plans));
  });
  it('空配列は空配列', () => {
    expect(interleaveByDir([])).toEqual([]);
  });
});
