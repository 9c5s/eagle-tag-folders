import * as fs from 'node:fs/promises';
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
    await retryOnTransientFsError(() => fs.rename(paths.managedDir, paths.oldDir));
    oldDir = paths.oldDir;
  }

  try {
    await retryOnTransientFsError(() => fs.rename(paths.stagingDir, paths.managedDir));
  } catch (err) {
    if (oldDir !== null) {
      await retryOnTransientFsError(() => fs.rename(oldDir as string, paths.managedDir)).catch(
        () => {}
      );
    }
    throw err;
  }

  return { oldDir };
}
