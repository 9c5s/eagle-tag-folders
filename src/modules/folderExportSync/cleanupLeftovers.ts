import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SyncError } from './types';
import { MANAGED_SUBDIR } from './constants';

/**
 * 前回の処理が中断した際に残留した staging および probe ディレクトリを削除する。
 * old ディレクトリは削除しない (cleanupOldDirs で別途管理する)。
 * @param rootDir 管理対象ルートディレクトリ。null の場合は何もしない
 */
export async function cleanupLeftovers(rootDir: string | null): Promise<void> {
  if (rootDir === null) return;

  const prefixes = [`${MANAGED_SUBDIR}.staging-`, `${MANAGED_SUBDIR}.probe-`];
  let entries: string[];
  try {
    entries = await fs.readdir(rootDir);
  } catch {
    return;
  }

  await Promise.all(
    entries.map(async (name) => {
      if (prefixes.some((p) => name.startsWith(p))) {
        await fs
          .rm(path.join(rootDir, name), { recursive: true, force: true })
          .catch((err: unknown) => {
            console.warn('cleanupLeftovers failed for', name, err);
          });
      }
    })
  );
}

/**
 * 今回退避した oldDir を 1 世代だけ残し、過去の old ディレクトリを全削除する。
 * execute の swap 成功直後に呼び出され、古い世代の滞留を防ぐ。
 * staging や probe ディレクトリは対象外。削除に失敗しても例外は投げない (warn のみ)。
 * @param rootDir 管理対象ルートディレクトリ
 * @param keep 今回残したい oldDir の絶対パス。null の場合は全 old を削除する
 */
export async function pruneOldDirs(rootDir: string, keep: string | null): Promise<void> {
  const prefix = `${MANAGED_SUBDIR}.old-`;
  let entries: string[];
  try {
    entries = await fs.readdir(rootDir);
  } catch {
    return;
  }

  const keepName = keep === null ? null : path.basename(keep);
  await Promise.all(
    entries.map(async (name) => {
      if (!name.startsWith(prefix)) return;
      if (keepName !== null && name === keepName) return;
      await fs
        .rm(path.join(rootDir, name), { recursive: true, force: true })
        .catch((err: unknown) => {
          console.warn('pruneOldDirs failed for', name, err);
        });
    })
  );
}

/**
 * 退避された old ディレクトリを全て削除する。
 * staging や probe ディレクトリは対象外。
 * @param rootDir 管理対象ルートディレクトリ
 * @returns 削除したディレクトリパス一覧と発生したエラー一覧
 */
export async function cleanupOldDirs(
  rootDir: string
): Promise<{ removed: string[]; errors: SyncError[] }> {
  const prefix = `${MANAGED_SUBDIR}.old-`;
  const removed: string[] = [];
  const errors: SyncError[] = [];

  let entries: string[];
  try {
    entries = await fs.readdir(rootDir);
  } catch (err) {
    errors.push({
      kind: 'fatal',
      phase: 'marker',
      message: (err as Error).message,
      originalError: err as Error
    });
    return { removed, errors };
  }

  await Promise.all(
    entries.map(async (name) => {
      if (!name.startsWith(prefix)) return;
      const full = path.join(rootDir, name);
      try {
        await fs.rm(full, { recursive: true, force: true });
        removed.push(full);
      } catch (err) {
        errors.push({
          kind: 'skipped',
          phase: 'marker',
          message: (err as Error).message,
          originalError: err as Error
        });
      }
    })
  );

  return { removed, errors };
}
