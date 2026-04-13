import { buildPlansFromPairs } from './buildPlansFromPairs';
import { resolveCategoryNames } from './categoryNames';
import { expandDescendants } from './expandDescendants';
import { buildFolderPairs, buildSmartFolderPairs, buildFlatPairs } from './resolveHierarchy';
import type { ItemDirPair } from './resolveHierarchy';
import type { CollectResult, PlanSummary, Settings, SymlinkPlan } from './types';

/**
 * collect 結果とカテゴリ設定から SymlinkPlan と PlanSummary を構築する。
 */
export function buildSyncPlan(
  collect: CollectResult,
  settings: Settings,
  managedDir: string,
  platform: NodeJS.Platform,
  locale: string
): { plans: SymlinkPlan[]; summary: PlanSummary } {
  const names = resolveCategoryNames(locale);
  const excludedFolderSet = expandDescendants(collect.folderTree, settings.excludedFolderIds);
  const excludedSmartFolderSet = expandDescendants(
    collect.smartFolderTree,
    settings.excludedSmartFolderIds
  );

  const pairs: ItemDirPair[] = [];
  const folderDirSet = new Set<string>();
  const smartFolderDirSet = new Set<string>();

  const accumulatePrefixes = (target: Set<string>, dir: string[]): void => {
    for (let depth = 2; depth <= dir.length; depth++) {
      target.add(dir.slice(0, depth).join('/'));
    }
  };

  if (settings.categories.folders) {
    const folderPairs = buildFolderPairs(collect.folderTree, collect.items, excludedFolderSet, [
      names.folders
    ]);
    for (const p of folderPairs) accumulatePrefixes(folderDirSet, p.dir);
    pairs.push(...folderPairs);
  }

  if (settings.categories.smartFolders) {
    const smartPairs = buildSmartFolderPairs(
      collect.smartFolderTree,
      collect.sfItemsCache,
      excludedSmartFolderSet,
      [names.smartFolders]
    );
    for (const p of smartPairs) accumulatePrefixes(smartFolderDirSet, p.dir);
    pairs.push(...smartPairs);
  }

  if (settings.categories.all) {
    pairs.push(...buildFlatPairs(collect.items, [names.all]));
  }
  if (settings.categories.untagged) {
    const untagged = collect.items.filter((i) => i.tags.length === 0);
    pairs.push(...buildFlatPairs(untagged, [names.untagged]));
  }
  if (settings.categories.uncategorized) {
    pairs.push(...buildFlatPairs(collect.uncategorizedItems, [names.uncategorized]));
  }

  const pb = buildPlansFromPairs(pairs, { settings, managedDir, platform });

  const uniqueItemIds = new Set<string>(collect.items.map((i) => i.id));
  for (const list of collect.sfItemsCache.values()) {
    for (const it of list) uniqueItemIds.add(it.id);
  }
  for (const it of collect.uncategorizedItems) uniqueItemIds.add(it.id);

  const summary: PlanSummary = {
    itemCount: uniqueItemIds.size,
    folderCount: folderDirSet.size,
    smartFolderCount: smartFolderDirSet.size,
    excludedFolderCount: excludedFolderSet.size,
    excludedSmartFolderCount: excludedSmartFolderSet.size,
    symlinkCount: pb.plans.length,
    collisionCount: pb.collisionCount,
    sanitizedNames: pb.sanitizedNames,
    warnings: pb.warnings
  };

  return { plans: pb.plans, summary };
}
