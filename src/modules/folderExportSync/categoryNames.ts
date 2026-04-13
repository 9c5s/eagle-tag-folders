import type { CategoryKey } from './types';

type SupportedLocale = 'en' | 'ja_JP';

const NAMES: Record<SupportedLocale, Record<CategoryKey, string>> = {
  en: {
    folders: 'folders',
    smartFolders: 'smart-folders',
    all: 'all',
    untagged: 'untagged',
    uncategorized: 'uncategorized'
  },
  ja_JP: {
    folders: 'フォルダ',
    smartFolders: 'スマートフォルダ',
    all: 'すべて',
    untagged: 'タグなし',
    uncategorized: '未分類'
  }
};

/**
 * Eagle が返すロケール文字列 (en / ja / ja_JP / zh_CN 等) を
 * この機能でサポートする 2 種 (en, ja_JP) に正規化する。
 * サポート外は en にフォールバックする。
 */
function normalizeLocale(locale: string): SupportedLocale {
  const head = locale.toLowerCase().split(/[-_]/)[0] ?? '';
  if (head === 'ja') return 'ja_JP';
  return 'en';
}

export function categoryDirName(key: CategoryKey, locale: string): string {
  return NAMES[normalizeLocale(locale)][key];
}

export function resolveCategoryNames(locale: string): Record<CategoryKey, string> {
  return { ...NAMES[normalizeLocale(locale)] };
}
