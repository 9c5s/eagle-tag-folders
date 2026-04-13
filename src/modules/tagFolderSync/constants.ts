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

/**
 * シンボリックリンク作成の並列度 (固定値)。
 * Windows (NTFS) と macOS (APFS) の両方で 13k symlink 級の実測から
 * 8 並列で飽和することを確認済み。16 以上ではばらつきが増えて悪化傾向。
 */
export const CONCURRENCY_SYMLINK = 8;

/**
 * ディレクトリ作成の並列度 (固定値)。
 * タグ数が少数 (通常 10 未満) のためボトルネックにならず、
 * symlink と揃えた値で問題ないことを実測済み。
 */
export const CONCURRENCY_MKDIR = 8;
