import * as fs from 'node:fs/promises';
import type { ResolvedPaths } from './types';

/**
 * staging ディレクトリを managed ディレクトリにアトミックに入れ替える。
 * 既存の managed ディレクトリが存在する場合は oldDir に退避してからリネームする。
 * staging → managed のリネームに失敗した場合、退避した oldDir を managed に戻すロールバックを試みる。
 * @param paths 派生パス情報
 * @returns 退避先 oldDir のパス (退避した場合)、または null (managed が存在しなかった場合)
 */
export async function atomicSwap(paths: ResolvedPaths): Promise<{ oldDir: string | null }> {
  let oldDir: string | null = null;

  // managed ディレクトリの存在を確認する
  const managedExists = await fs
    .stat(paths.managedDir)
    .then(() => true)
    .catch(() => false);

  // 既存の managed ディレクトリを oldDir に退避する
  if (managedExists) {
    await fs.rename(paths.managedDir, paths.oldDir);
    oldDir = paths.oldDir;
  }

  // staging を managed にリネームする。失敗時はロールバックを試みる
  try {
    await fs.rename(paths.stagingDir, paths.managedDir);
  } catch (err) {
    if (oldDir !== null) {
      // ロールバック: 退避した oldDir を managed に戻す
      await fs.rename(oldDir, paths.managedDir).catch(() => {});
    }
    throw err;
  }

  return { oldDir };
}
