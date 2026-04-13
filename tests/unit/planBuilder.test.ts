import { describe, it, expect } from 'vitest';
import { buildSyncPlan } from '@/modules/tagFolderSync/planBuilder';
import { DEFAULT_SETTINGS } from '@/modules/tagFolderSync/types';
import type { EagleItem, EagleTagGroup } from '@/modules/tagFolderSync/types';

const item = (id: string, name: string, tags: string[]): EagleItem => ({
  id,
  name,
  ext: 'png',
  filePath: `/src/${id}.png`,
  tags
});

const MANAGED = '/root/eagle-tag-folders';

describe('buildSyncPlan', () => {
  it('アイテム 1 × タグ 1 = プラン 1', () => {
    const { plans, summary } = buildSyncPlan(
      [item('i1', 'photo', ['sky'])],
      [],
      DEFAULT_SETTINGS,
      MANAGED,
      'linux'
    );
    expect(plans).toHaveLength(1);
    expect(plans[0]!.destDir).toBe('sky');
    expect(plans[0]!.destName).toBe('photo.png');
    expect(summary.symlinkCount).toBe(1);
    expect(summary.collisionCount).toBe(0);
  });

  it('同一 dir 内同名衝突 → suffix モードで (2) 付加', () => {
    const { plans, summary } = buildSyncPlan(
      [item('i1', 'photo', ['sky']), item('i2', 'photo', ['sky'])],
      [],
      DEFAULT_SETTINGS,
      MANAGED,
      'linux'
    );
    const names = plans.map((p) => p.destName).sort();
    expect(names).toEqual(['photo (2).png', 'photo.png']);
    expect(summary.collisionCount).toBe(1);
  });

  it('id モードは常に ID 付加', () => {
    const { plans } = buildSyncPlan(
      [item('i1', 'photo', ['sky'])],
      [],
      { ...DEFAULT_SETTINGS, namingMode: 'id' },
      MANAGED,
      'linux'
    );
    expect(plans[0]!.destName).toBe('photo_i1.png');
  });

  it('グループ所属タグは group/tag に', () => {
    const g: EagleTagGroup = { name: 'Colors', tags: ['blue'] };
    const { plans } = buildSyncPlan(
      [item('i1', 'p', ['blue'])],
      [g],
      DEFAULT_SETTINGS,
      MANAGED,
      'linux'
    );
    expect(plans[0]!.destDir).toBe('Colors/blue');
    expect(plans[0]!.displayTag).toBe('Colors/blue');
  });

  it('summary が正しく計算される', () => {
    const { summary } = buildSyncPlan(
      [item('i1', 'a', ['sky']), item('i2', 'b', ['sky', 'tree'])],
      [],
      DEFAULT_SETTINGS,
      MANAGED,
      'linux'
    );
    expect(summary.itemCount).toBe(2);
    expect(summary.symlinkCount).toBe(3);
    expect(summary.tagCount).toBe(2);
  });

  it('Windows 260 文字超のパスは plan から除外、warnings に記録', () => {
    const longName = 'x'.repeat(250);
    const longItem = item('i_long', longName, ['sky']);
    const { plans, summary } = buildSyncPlan(
      [longItem],
      [],
      DEFAULT_SETTINGS,
      'C:\\\\root\\\\eagle-tag-folders',
      'win32'
    );
    expect(plans).toHaveLength(0);
    expect(
      summary.warnings.some(
        (w) => w.includes('長すぎる') || w.includes('超え') || w.includes('上限')
      )
    ).toBe(true);
  });

  it('Linux 4096 文字 budget では余裕で通る', () => {
    const longName = 'x'.repeat(250);
    const longItem = item('i_long', longName, ['sky']);
    const { plans } = buildSyncPlan(
      [longItem],
      [],
      DEFAULT_SETTINGS,
      '/root/eagle-tag-folders',
      'linux'
    );
    expect(plans).toHaveLength(1);
  });
});
