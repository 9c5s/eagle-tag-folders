/**
 * 管理サブディレクトリ名の定数。
 * MVP では完全固定 (UI からも変更不可)。
 * 仕様書 1.5 / 2.1 参照。
 */
export const MANAGED_SUBDIR = 'eagle-tag-folders' as const;

/**
 * 目印ファイル名。managedDir 直下に置く。
 */
export const MARKER_FILE = '.tagfolders-managed.json';

/**
 * 設定ファイルの localStorage キー生成関数。
 */
export function settingsKey(pluginId: string): string {
  return `eagle.plugin.${pluginId}.setting`;
}
