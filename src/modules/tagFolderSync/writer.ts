import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SymlinkPlan, ResolvedPaths, Settings, ExecutionCallbacks, SyncError } from './types';
import { classify } from './errorClassifier';
import { interleaveByDir } from './interleaveByDir';

/**
 * 並列処理ワーカーユーティリティ。
 * 指定した concurrency 数を上限に、items を並列実行する。
 */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const current = i++;
      results[current] = await handler(items[current]!, current);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * SymlinkPlan のリストに基づき、stagingDir 内にディレクトリとシンボリックリンクを作成する。
 * 並列書き込みに対応しており、concurrency 設定に従って同時実行数を制御する。
 * @param plans 作成するシンボリックリンクのプラン一覧
 * @param paths 派生パス情報
 * @param settings ユーザー設定 (concurrency を参照)
 * @param callbacks 進捗・エラーコールバック
 * @returns stagingDir パスとエラー一覧
 */
export async function writeToStaging(
  plans: SymlinkPlan[],
  paths: ResolvedPaths,
  settings: Settings,
  callbacks: ExecutionCallbacks
): Promise<{ stagingDir: string; errors: SyncError[] }> {
  const errors: SyncError[] = [];
  const ordered = interleaveByDir(plans);

  // 宛先ディレクトリを事前に一括作成する
  const uniqueDirs = new Set(ordered.map((p) => p.destDir));
  await runWithConcurrency([...uniqueDirs], settings.concurrency.mkdir, async (dir) => {
    await fs.mkdir(path.join(paths.stagingDir, dir), { recursive: true });
  });

  // シンボリックリンクを並列作成する
  const total = ordered.length;
  let completed = 0;
  await runWithConcurrency(ordered, settings.concurrency.symlink, async (plan) => {
    const dest = path.join(paths.stagingDir, plan.destDir, plan.destName);
    try {
      await fs.symlink(plan.sourcePath, dest, 'file');
    } catch (err) {
      const kind = classify(err as NodeJS.ErrnoException, 'write');
      const syncErr: SyncError = {
        kind,
        phase: 'write',
        itemId: plan.itemId,
        message: (err as Error).message,
        originalError: err as Error
      };
      if (kind === 'fatal') {
        throw syncErr;
      }
      errors.push(syncErr);
      callbacks.onError?.(syncErr);
    }
    completed++;
    callbacks.onProgress?.(completed, total, plan.displayTag);
  });

  return { stagingDir: paths.stagingDir, errors };
}
