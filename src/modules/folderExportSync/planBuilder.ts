import type { EagleItem, EagleTagGroup, Settings, SymlinkPlan, PlanSummary } from './types';
import { resolveAllPaths } from './resolveFolder';
import { sanitizeDirName, sanitizeFileName, computePathBudget, fitsWithinBudget } from './sanitize';

/**
 * Eagle アイテムとタググループからシンボリックリンク計画を構築する。
 * 衝突解決 (suffix/id モード)、パス長 budget チェック、sanitize を行う。
 * @param items Eagle アイテムの配列
 * @param tagGroups タググループの定義配列
 * @param settings ユーザー設定
 * @param managedDir 管理ディレクトリの絶対パス
 * @param platform 実行プラットフォーム
 * @returns シンボリックリンク計画の配列とサマリ
 */
export function buildSyncPlan(
  items: EagleItem[],
  tagGroups: EagleTagGroup[],
  settings: Settings,
  managedDir: string,
  platform: NodeJS.Platform
): { plans: SymlinkPlan[]; summary: PlanSummary } {
  const replacement = settings.sanitizeReplacement;
  const sanitizedNames: PlanSummary['sanitizedNames'] = [];
  const warnings: string[] = [];
  const budget = computePathBudget(managedDir, platform);

  // アイテム × タグのペアを全て解決する
  const pairs = resolveAllPaths(items, tagGroups);

  // destDir ごとに衝突した destName のカウントを管理する
  const usedNames = new Map<string, Map<string, number>>();
  const plans: SymlinkPlan[] = [];
  let collisionCount = 0;
  let droppedCount = 0;
  // グループ名とタグ名を分けて集計する
  const groupSet = new Set<string>();
  const tagSet = new Set<string>();

  for (const { item, dir } of pairs) {
    // ディレクトリパスの各セグメントを sanitize する
    const segments = dir.split('/');
    const sanitizedSegments = segments.map((s) => {
      const sanitized = sanitizeDirName(s, replacement);
      if (sanitized !== s) sanitizedNames.push({ original: s, sanitized });
      return sanitized;
    });
    const destDir = sanitizedSegments.join('/');

    // グループ/タグの分類を記録する (グループ下のタグは segments[0] がグループ名)
    sanitizedSegments.forEach((s, i) => {
      if (i === 0 && segments.length > 1) groupSet.add(s);
      else tagSet.add(s);
    });

    // ファイル名を sanitize する
    const baseNameSource = `${item.name}.${item.ext}`;
    const sanitizedBase = sanitizeFileName(baseNameSource, replacement);
    if (sanitizedBase !== baseNameSource) {
      sanitizedNames.push({ original: baseNameSource, sanitized: sanitizedBase });
    }

    const dot = sanitizedBase.lastIndexOf('.');
    const extPart = dot > 0 ? sanitizedBase.slice(dot) : '';

    // パス長 budget チェック: 超過する場合は除外して warnings に記録する
    if (!fitsWithinBudget([...sanitizedSegments, sanitizedBase], extPart.length, budget)) {
      droppedCount++;
      warnings.push(
        `アイテム ${item.id} (${item.name}) のパスが OS 上限 (${budget.maxTotal}) を超えるため除外: ${destDir}/${sanitizedBase}`
      );
      continue;
    }

    let destName: string;
    if (settings.namingMode === 'id') {
      // id モード: 常にアイテム ID をベース名に付加する
      const base = dot > 0 ? sanitizedBase.slice(0, dot) : sanitizedBase;
      destName = `${base}_${item.id}${extPart}`;
    } else {
      // suffix モード: 同一ディレクトリ内で衝突した場合に連番を付加する
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
      itemId: item.id,
      sourcePath: item.filePath,
      destDir,
      destName,
      displayTag: destDir
    });
  }

  // パス長超過による除外があった場合は先頭に総計警告を追加する
  if (droppedCount > 0) {
    warnings.unshift(
      `パス長超過により ${droppedCount} 件のアイテムを除外しました (詳細は後続の warnings 参照)`
    );
  }

  const summary: PlanSummary = {
    itemCount: items.length,
    excludedItemCount: 0,
    groupCount: groupSet.size,
    tagCount: tagSet.size,
    folderCount: 0,
    smartFolderCount: 0,
    excludedFolderCount: 0,
    excludedSmartFolderCount: 0,
    symlinkCount: plans.length,
    collisionCount,
    sanitizedNames,
    warnings
  };

  return { plans, summary };
}
