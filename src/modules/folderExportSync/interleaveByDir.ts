import type { SymlinkPlan } from './types';

/**
 * 複数のディレクトリに属するプランを、ディレクトリごとに交互に並べ替える。
 * 並列書き込み時に各ディレクトリへのアクセスを均等に分散させるための最適化。
 * @param plans SymlinkPlan の配列
 * @returns 交互に並べ替えられたプラン配列
 */
export function interleaveByDir(plans: SymlinkPlan[]): SymlinkPlan[] {
  // destDir ごとにプランをグループ化する
  const byDir = new Map<string, SymlinkPlan[]>();
  for (const p of plans) {
    const arr = byDir.get(p.destDir) ?? [];
    arr.push(p);
    byDir.set(p.destDir, arr);
  }

  // Map の値を配列として取得（順序は保持される）
  const dirs = [...byDir.values()];

  // 最大の長さを取得
  const maxLen = dirs.length === 0 ? 0 : Math.max(...dirs.map((d) => d.length));

  // ラウンドロビン方式で交互に結果に追加
  const result: SymlinkPlan[] = [];
  for (let i = 0; i < maxLen; i++) {
    for (const dir of dirs) {
      const plan = dir[i];
      if (plan !== undefined) result.push(plan);
    }
  }

  return result;
}
