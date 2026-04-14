import { sanitizeDirName, sanitizeFileName, computePathBudget, fitsWithinBudget } from './sanitize';
import type { Settings, SymlinkPlan, PlanSummary } from './types';
import type { ItemDirPair } from './resolveHierarchy';

export type BuildPlansContext = {
  settings: Settings;
  managedDir: string;
  platform: NodeJS.Platform;
};

/**
 * (item, dir) ペアの配列を受け取り、sanitize / budget / 衝突解決を行って
 * SymlinkPlan の配列と部分的な PlanSummary (sanitizedNames / warnings /
 * collisionCount / symlinkCount) を生成する。
 * folders/smart-folders/flat など全カテゴリで共有できるように責務を絞ってある。
 */
export function buildPlansFromPairs(
  pairs: ItemDirPair[],
  ctx: BuildPlansContext
): {
  plans: SymlinkPlan[];
  sanitizedNames: PlanSummary['sanitizedNames'];
  warnings: string[];
  collisionCount: number;
  droppedCount: number;
} {
  const { settings, managedDir, platform } = ctx;
  const replacement = settings.sanitizeReplacement;
  const budget = computePathBudget(managedDir, platform);
  const sanitizedNames: PlanSummary['sanitizedNames'] = [];
  const warnings: string[] = [];
  const plans: SymlinkPlan[] = [];
  const usedNames = new Map<string, Map<string, number>>();
  let collisionCount = 0;
  let pathExceededCount = 0;
  let missingFilePathCount = 0;

  // (item.id, dir) が完全一致する pair の重複を除外する。
  // smartFolder tree で同名 node が flat に並ぶ等の理由で同じ symlink が
  // 二重に計画されると writer 側で EEXIST で skip されるため、入口で吸収する。
  const seenPair = new Set<string>();
  const dedupedPairs: ItemDirPair[] = [];
  for (const pair of pairs) {
    const key = `${pair.item.id}\u0000${pair.dir.join('\u0000')}`;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    dedupedPairs.push(pair);
  }

  for (const pair of dedupedPairs) {
    // Eagle API 側で filePath を欠落させて返すアイテムがある (例: 一部の smartFolder.getItems)。
    // 型宣言では string だが実体は undefined になりうるため、symlink 作成前にここで除外する。
    if (typeof pair.item.filePath !== 'string' || pair.item.filePath.length === 0) {
      missingFilePathCount++;
      warnings.push(
        `アイテム ${pair.item.id} (${pair.item.name}) の filePath が取得できないため除外`
      );
      continue;
    }
    const sanitizedSegments = pair.dir.map((seg) => {
      const s = sanitizeDirName(seg, replacement);
      if (s !== seg) sanitizedNames.push({ original: seg, sanitized: s });
      return s;
    });
    const destDir = sanitizedSegments.join('/');

    const baseNameSource = `${pair.item.name}.${pair.item.ext}`;
    const sanitizedBase = sanitizeFileName(baseNameSource, replacement);
    if (sanitizedBase !== baseNameSource) {
      sanitizedNames.push({ original: baseNameSource, sanitized: sanitizedBase });
    }
    const dot = sanitizedBase.lastIndexOf('.');
    const extPart = dot > 0 ? sanitizedBase.slice(dot) : '';

    if (!fitsWithinBudget([...sanitizedSegments, sanitizedBase], budget)) {
      pathExceededCount++;
      warnings.push(
        `アイテム ${pair.item.id} (${pair.item.name}) のパスが OS 上限 (${budget.maxTotal}) を超えるため除外: ${destDir}/${sanitizedBase}`
      );
      continue;
    }

    let destName: string;
    if (settings.namingMode === 'id') {
      const base = dot > 0 ? sanitizedBase.slice(0, dot) : sanitizedBase;
      destName = `${base}_${pair.item.id}${extPart}`;
    } else {
      const perDir = usedNames.get(destDir) ?? new Map<string, number>();
      const count = perDir.get(sanitizedBase) ?? 0;
      if (count === 0) {
        destName = sanitizedBase;
      } else {
        const base = dot > 0 ? sanitizedBase.slice(0, dot) : sanitizedBase;
        destName = `${base} (${count + 1})${extPart}`;
        collisionCount++;
      }
      perDir.set(sanitizedBase, count + 1);
      usedNames.set(destDir, perDir);
    }

    plans.push({
      itemId: pair.item.id,
      sourcePath: pair.item.filePath,
      destDir,
      destName,
      displayTag: destDir
    });
  }

  // unshift は逆順に積むので、表示したい順序の逆で追加する (先に path 超過、後に filePath 欠落)
  if (missingFilePathCount > 0) {
    warnings.unshift(
      `Eagle API から filePath を取得できなかったため ${missingFilePathCount} 件のアイテムを除外しました (詳細は後続の warnings 参照)`
    );
  }
  if (pathExceededCount > 0) {
    warnings.unshift(
      `パス長超過により ${pathExceededCount} 件のアイテムを除外しました (詳細は後続の warnings 参照)`
    );
  }

  return {
    plans,
    sanitizedNames,
    warnings,
    collisionCount,
    droppedCount: pathExceededCount + missingFilePathCount
  };
}
