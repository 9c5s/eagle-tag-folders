import { describe, it, expect } from 'vitest';
import { categoryDirName, resolveCategoryNames } from '@/modules/folderExportSync/categoryNames';

describe('categoryDirName', () => {
  it('en ロケール', () => {
    expect(categoryDirName('folders', 'en')).toBe('folders');
    expect(categoryDirName('smartFolders', 'en')).toBe('smart-folders');
    expect(categoryDirName('all', 'en')).toBe('all');
    expect(categoryDirName('untagged', 'en')).toBe('untagged');
    expect(categoryDirName('uncategorized', 'en')).toBe('uncategorized');
  });

  it('ja / ja_JP ロケール', () => {
    expect(categoryDirName('folders', 'ja')).toBe('フォルダ');
    expect(categoryDirName('folders', 'ja_JP')).toBe('フォルダ');
    expect(categoryDirName('smartFolders', 'ja_JP')).toBe('スマートフォルダ');
    expect(categoryDirName('all', 'ja_JP')).toBe('すべて');
    expect(categoryDirName('untagged', 'ja_JP')).toBe('タグなし');
    expect(categoryDirName('uncategorized', 'ja_JP')).toBe('未分類');
  });

  it('未対応ロケールは en にフォールバック', () => {
    expect(categoryDirName('folders', 'zh_CN')).toBe('folders');
    expect(categoryDirName('folders', 'fr')).toBe('folders');
  });
});

describe('resolveCategoryNames', () => {
  it('指定ロケールの全カテゴリ名を返す', () => {
    expect(resolveCategoryNames('ja_JP')).toEqual({
      folders: 'フォルダ',
      smartFolders: 'スマートフォルダ',
      all: 'すべて',
      untagged: 'タグなし',
      uncategorized: '未分類'
    });
  });
});
