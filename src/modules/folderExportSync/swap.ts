import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ResolvedPaths } from './types';

/**
 * Windows で大量の symlink を含むディレクトリを rename しようとすると、
 * Explorer のサムネイル生成 / Windows Search インデクサ / アンチウイルスが
 * 一時的にハンドルを掴んで EPERM / EBUSY / EACCES を返すことがある。
 * 短い指数バックオフでリトライして一時的な衝突を吸収する。
 */
export async function retryOnTransientFsError<T>(
  op: () => Promise<T>,
  opts?: { attempts?: number; delayMs?: number }
): Promise<T> {
  const attempts = opts?.attempts ?? 6;
  const delayMs = opts?.delayMs ?? 250;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      const e = err as NodeJS.ErrnoException;
      const transient = e?.code === 'EPERM' || e?.code === 'EBUSY' || e?.code === 'EACCES';
      if (!transient || i >= attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * from ディレクトリの中身を 1 エントリずつ to に move する。
 * ディレクトリ丸ごと rename が Explorer の掴み等で EPERM 連続の場合の
 * フォールバックとして使う。個別 rename はディレクトリ rename より通りやすい。
 * atomicity は失われるが、体験を優先する。
 */
export async function moveDirectoryContents(from: string, to: string): Promise<void> {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    await retryOnTransientFsError(() =>
      fs.rename(path.join(from, entry.name), path.join(to, entry.name))
    );
  }
  // 空になった from を削除 (Explorer 掴みで失敗しても致命的ではないので無視)
  await fs.rmdir(from).catch(() => {});
}

/**
 * from → to の rename をまず試し、EPERM / EBUSY / EACCES が続く場合は
 * 中身の個別 move にフォールバックする。Windows で Explorer が対象 dir を
 * 開きっぱなしでも同期が完了するようにする。
 */
async function renameOrMoveContents(from: string, to: string): Promise<void> {
  try {
    await retryOnTransientFsError(() => fs.rename(from, to));
    return;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code !== 'EPERM' && e?.code !== 'EBUSY' && e?.code !== 'EACCES') {
      throw err;
    }
  }
  await moveDirectoryContents(from, to);
}

/**
 * staging ディレクトリを managed ディレクトリにアトミックに入れ替える。
 * 既存の managed ディレクトリが存在する場合は oldDir に退避してからリネームする。
 * staging → managed のリネームに失敗した場合、退避した oldDir を managed に戻すロールバックを試みる。
 * Windows の一時的な EPERM / EBUSY はリトライで吸収する。
 * @param paths 派生パス情報
 * @returns 退避先 oldDir のパス (退避した場合)、または null (managed が存在しなかった場合)
 */
export async function atomicSwap(paths: ResolvedPaths): Promise<{ oldDir: string | null }> {
  let oldDir: string | null = null;

  const managedExists = await fs
    .stat(paths.managedDir)
    .then(() => true)
    .catch(() => false);

  if (managedExists) {
    await renameOrMoveContents(paths.managedDir, paths.oldDir);
    oldDir = paths.oldDir;
  }

  try {
    await renameOrMoveContents(paths.stagingDir, paths.managedDir);
  } catch (err) {
    if (oldDir !== null) {
      await renameOrMoveContents(oldDir, paths.managedDir).catch(() => {});
    }
    throw err;
  }

  return { oldDir };
}
