/**
 * エラー分類の種類。
 * fatal: 処理停止が必要なエラー
 * skipped: スキップ可能なエラー
 */
type ErrorKind = 'fatal' | 'skipped';

/**
 * 致命的エラーとなる errno コードのセット。
 * これらのエラーが発生した場合、同期処理全体を停止する必要がある。
 */
const FATAL = new Set([
  'EPERM', // Operation not permitted
  'EACCES', // Permission denied
  'ENOSPC', // No space left on device
  'EROFS', // Read-only file system
  'EMFILE', // Too many open files
  'ENFILE', // File table overflow
  'EXDEV', // Cross-device link
  'EINVAL', // Invalid argument
  'ENAMETOOLONG' // Filename too long
]);

/**
 * スキップ可能なエラーとなる errno コードのセット。
 * これらのエラーが発生した場合、その個別項目をスキップして処理を続行できる。
 */
const SKIPPED = new Set(['ENOENT', 'EEXIST', 'ELOOP']);

/**
 * ファイルシステム操作のエラーを分類する。
 * @param error Node.js のエラーオブジェクト
 * @param _phase エラーが発生したフェーズ（現在未使用）
 * @returns エラー分類（'fatal' または 'skipped'）
 */
export function classify(error: NodeJS.ErrnoException, _phase: string): ErrorKind {
  const code = error.code;

  // code が未定義の場合は fatal 扱い
  if (code === undefined) return 'fatal';

  // FATAL セットに含まれる場合
  if (FATAL.has(code)) return 'fatal';

  // SKIPPED セットに含まれる場合
  if (SKIPPED.has(code)) return 'skipped';

  // 既知でないエラーコードはフォールバックで fatal 扱い
  return 'fatal';
}
