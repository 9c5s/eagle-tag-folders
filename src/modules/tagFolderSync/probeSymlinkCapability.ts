import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ResolvedPaths } from './types';

/**
 * symlink 操作の依存関係インターフェース。
 * テストで差し替え可能にするために定義する。
 */
export interface FsOps {
  stat: typeof fs.stat;
  mkdir: typeof fs.mkdir;
  symlink: typeof fs.symlink;
  rm: typeof fs.rm;
}

/**
 * symlink 作成可能性を事前検査する。
 *
 * @param paths ResolvedPaths (probeDir を使う)
 * @param existingFilePath リンク元として使える実在ファイルの絶対パス。
 *                         呼び出し側 (orchestrator) が Eagle ライブラリから具体ファイルを渡す。
 * @param ops fs 操作の実装 (テスト時に差し替え可能)
 * @throws ENOENT - existingFilePath が存在しない場合
 * @throws EPERM  - symlink 作成権限がない場合 (Windows 開発者モード無効時)
 */
export async function probeSymlinkCapability(
  paths: ResolvedPaths,
  existingFilePath: string,
  ops: FsOps = fs
): Promise<void> {
  // 対象ファイルの存在確認 (呼び出し側の責務だが防御的に stat)
  await ops.stat(existingFilePath);

  await ops.mkdir(paths.probeDir, { recursive: true });
  const linkPath = path.join(paths.probeDir, 'probe-link');
  try {
    await ops.symlink(existingFilePath, linkPath, 'file');
  } catch (err) {
    await ops.rm(paths.probeDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
  await ops.rm(paths.probeDir, { recursive: true, force: true }).catch((err) => {
    console.warn('probe cleanup failed (best-effort), will be swept by cleanupLeftovers:', err);
  });
}
