import { describe, it, expect } from 'vitest';
import { buildSyncPlan } from '@/modules/folderExportSync/planBuilder';
import { DEFAULT_SETTINGS } from '@/modules/folderExportSync/types';
import type { CollectResult, EagleItem, Settings } from '@/modules/folderExportSync/types';

const mkItem = (id: string, tags: string[] = [], folders: string[] = []): EagleItem => ({
  id,
  name: id,
  ext: 'png',
  filePath: `/src/${id}.png`,
  tags,
  folders
});

const MANAGED = '/root/eagle-folder-export';

const baseResult = (overrides?: Partial<CollectResult>): CollectResult => ({
  items: [],
  folderTree: [],
  smartFolderTree: [],
  sfItemsCache: new Map(),
  uncategorizedItems: [],
  ...overrides
});

const settings = (overrides?: Partial<Settings>): Settings => ({
  ...DEFAULT_SETTINGS,
  ...overrides
});

describe('buildSyncPlan', () => {
  it('folders カテゴリ: Eagle フォルダ階層に配置', () => {
    const { plans } = buildSyncPlan(
      baseResult({
        folderTree: [{ id: 'F1', name: 'Folder 1', parent: null, children: [] }],
        items: [mkItem('i1', [], ['F1'])]
      }),
      settings({
        categories: {
          folders: true,
          smartFolders: false,
          all: false,
          untagged: false,
          uncategorized: false
        }
      }),
      MANAGED,
      'linux',
      'en'
    );
    expect(plans).toHaveLength(1);
    expect(plans[0]!.destDir).toBe('folders/Folder 1');
  });

  it('sanitize 後に (destDir, destName) が完全一致する plan の重複は最終的に除外される', () => {
    // dir 文字列は別だが sanitize で末尾空白が消えて同じ destDir に解決される
    // ような Eagle データを再現する。usedNames の衝突解決で (2) 化されるはず
    // だが、念のため dest path レベルでも保険で重複排除されることを保証する。
    const flatTree = [
      { id: 'S_a', name: 'mov', parent: null, children: [] },
      // 末尾空白付き → sanitize 後は同じ "mov" に正規化される
      { id: 'S_b', name: 'mov ', parent: null, children: [] }
    ];
    const item = mkItem('shared');
    const cache = new Map<string, EagleItem[]>([
      ['S_a', [item]],
      ['S_b', [item]]
    ]);
    const { plans } = buildSyncPlan(
      baseResult({
        smartFolderTree: flatTree,
        sfItemsCache: cache
      }),
      settings({
        categories: {
          folders: false,
          smartFolders: true,
          all: false,
          untagged: false,
          uncategorized: false
        }
      }),
      MANAGED,
      'linux',
      'en'
    );
    const movPlans = plans.filter((p) => p.destDir === 'smart-folders/mov');
    // 同一 (destDir, destName) の plan は 1 つのみであることを保証 (writer の EEXIST 防止)
    const seen = new Set<string>();
    for (const p of movPlans) {
      const key = `${p.destDir}/${p.destName}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('同じ item を同じ dir に置こうとする pair の重複は 1 plan に圧縮する', () => {
    // smartFolder tree が flat 化されて同名 node が複数並ぶケースを再現する。
    // ここでは独立 "mov" と "type" 配下の子 "mov" がどちらも root 直下の flat
    // list として返り、同じ item が両方に matching したと仮定する。
    const flatTree = [
      { id: 'S_mov', name: 'mov', parent: null, children: [] },
      { id: 'S_type_mov', name: 'mov', parent: null, children: [] }
    ];
    const item = mkItem('shared');
    const cache = new Map<string, EagleItem[]>([
      ['S_mov', [item]],
      ['S_type_mov', [item]]
    ]);
    const { plans } = buildSyncPlan(
      baseResult({
        smartFolderTree: flatTree,
        sfItemsCache: cache
      }),
      settings({
        categories: {
          folders: false,
          smartFolders: true,
          all: false,
          untagged: false,
          uncategorized: false
        }
      }),
      MANAGED,
      'linux',
      'en'
    );
    // (item, dir) が完全一致する pair は重複排除されて 1 plan のみ
    const movPlans = plans.filter((p) => p.destDir === 'smart-folders/mov');
    expect(movPlans).toHaveLength(1);
    expect(movPlans[0]!.destName).toBe('shared.png');
  });

  it('item.filePath が undefined のアイテムは plan から除外し warnings に記録する', () => {
    const broken: EagleItem = {
      id: 'broken',
      name: 'broken',
      ext: 'png',
      // Eagle API の応答で filePath が欠落するケースを想定 (型の嘘を意図的に再現)
      filePath: undefined as unknown as string,
      tags: [],
      folders: ['F1']
    };
    const { plans, summary } = buildSyncPlan(
      baseResult({
        folderTree: [{ id: 'F1', name: 'Folder 1', parent: null, children: [] }],
        items: [broken, mkItem('ok', [], ['F1'])]
      }),
      settings({
        categories: {
          folders: true,
          smartFolders: false,
          all: false,
          untagged: false,
          uncategorized: false
        }
      }),
      MANAGED,
      'linux',
      'en'
    );
    expect(plans).toHaveLength(1);
    expect(plans[0]!.itemId).toBe('ok');
    expect(summary.warnings.some((w) => w.includes('broken'))).toBe(true);
    // summary 先頭には filePath 欠落の集計行が含まれ、誤って「パス長超過」と
    // 混同して表示されないこと
    expect(summary.warnings[0]).toMatch(/filePath.*取得できなかった/);
    expect(summary.warnings.some((w) => w.startsWith('パス長超過により'))).toBe(false);
  });

  it('all カテゴリ: フラットに配置', () => {
    const { plans } = buildSyncPlan(
      baseResult({
        items: [mkItem('i1'), mkItem('i2')]
      }),
      settings({
        categories: {
          folders: false,
          smartFolders: false,
          all: true,
          untagged: false,
          uncategorized: false
        }
      }),
      MANAGED,
      'linux',
      'en'
    );
    expect(plans).toHaveLength(2);
    expect(new Set(plans.map((p) => p.destDir))).toEqual(new Set(['all']));
  });

  it('untagged カテゴリ: tags.length===0 のアイテムだけ', () => {
    const { plans } = buildSyncPlan(
      baseResult({
        items: [mkItem('i1', ['a']), mkItem('i2')]
      }),
      settings({
        categories: {
          folders: false,
          smartFolders: false,
          all: false,
          untagged: true,
          uncategorized: false
        }
      }),
      MANAGED,
      'linux',
      'en'
    );
    expect(plans.map((p) => p.itemId)).toEqual(['i2']);
  });

  it('uncategorized カテゴリ: uncategorizedItems を使う', () => {
    const { plans } = buildSyncPlan(
      baseResult({
        uncategorizedItems: [mkItem('u1')]
      }),
      settings({
        categories: {
          folders: false,
          smartFolders: false,
          all: false,
          untagged: false,
          uncategorized: true
        }
      }),
      MANAGED,
      'linux',
      'en'
    );
    expect(plans.map((p) => p.itemId)).toEqual(['u1']);
  });

  it('smartFolders カテゴリ: sfItemsCache を使って階層配置', () => {
    const { plans } = buildSyncPlan(
      baseResult({
        smartFolderTree: [{ id: 'S1', name: 'Smart A', parent: null, children: [] }],
        sfItemsCache: new Map([['S1', [mkItem('i1')]]])
      }),
      settings({
        categories: {
          folders: false,
          smartFolders: true,
          all: false,
          untagged: false,
          uncategorized: false
        }
      }),
      MANAGED,
      'linux',
      'en'
    );
    expect(plans[0]!.destDir).toBe('smart-folders/Smart A');
  });

  it('ロケール ja_JP でディレクトリ名が日本語に', () => {
    const { plans } = buildSyncPlan(
      baseResult({
        folderTree: [{ id: 'F1', name: 'Folder 1', parent: null, children: [] }],
        items: [mkItem('i1', [], ['F1'])]
      }),
      settings({
        categories: {
          folders: true,
          smartFolders: false,
          all: false,
          untagged: false,
          uncategorized: false
        }
      }),
      MANAGED,
      'linux',
      'ja_JP'
    );
    expect(plans[0]!.destDir.startsWith('フォルダ/')).toBe(true);
  });

  it('summary に folderCount / smartFolderCount / excludedFolderCount / excludedSmartFolderCount を設定', () => {
    const { summary } = buildSyncPlan(
      baseResult({
        folderTree: [
          {
            id: 'F1',
            name: 'Folder 1',
            parent: null,
            children: [{ id: 'F2', name: 'Folder 2', parent: 'F1', children: [] }]
          }
        ],
        smartFolderTree: [{ id: 'S1', name: 'Smart A', parent: null, children: [] }],
        items: [mkItem('i1', [], ['F1']), mkItem('i2', [], ['F2'])],
        sfItemsCache: new Map([['S1', [mkItem('i1')]]])
      }),
      settings({
        categories: {
          folders: true,
          smartFolders: true,
          all: false,
          untagged: false,
          uncategorized: false
        },
        excludedFolderIds: [],
        excludedSmartFolderIds: []
      }),
      MANAGED,
      'linux',
      'en'
    );
    expect(summary.folderCount).toBe(2);
    expect(summary.smartFolderCount).toBe(1);
    expect(summary.excludedFolderCount).toBe(0);
    expect(summary.excludedSmartFolderCount).toBe(0);
  });

  it('除外指定があれば excludedFolderCount / excludedSmartFolderCount に反映', () => {
    const { summary } = buildSyncPlan(
      baseResult({
        folderTree: [
          {
            id: 'F1',
            name: 'Folder 1',
            parent: null,
            children: [{ id: 'F2', name: 'Folder 2', parent: 'F1', children: [] }]
          }
        ]
      }),
      settings({
        categories: {
          folders: true,
          smartFolders: false,
          all: false,
          untagged: false,
          uncategorized: false
        },
        excludedFolderIds: ['F1']
      }),
      MANAGED,
      'linux',
      'en'
    );
    expect(summary.excludedFolderCount).toBe(2);
  });

  it('Windows 260 文字超は除外 + warnings', () => {
    const longName = 'x'.repeat(250);
    const { plans, summary } = buildSyncPlan(
      baseResult({
        folderTree: [{ id: 'F1', name: 'Folder 1', parent: null, children: [] }],
        items: [mkItem(longName, [], ['F1'])]
      }),
      settings({
        categories: {
          folders: true,
          smartFolders: false,
          all: false,
          untagged: false,
          uncategorized: false
        }
      }),
      'C:\\root\\eagle-folder-export',
      'win32',
      'en'
    );
    expect(plans).toHaveLength(0);
    expect(summary.warnings.some((w) => w.includes('上限') || w.includes('超え'))).toBe(true);
  });
});
