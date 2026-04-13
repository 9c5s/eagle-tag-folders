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
