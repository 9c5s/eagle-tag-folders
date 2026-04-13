import type { EagleItem, EagleTagGroup } from './types';

/**
 * Eagle API から全アイテムとタググループを取得し、除外条件でフィルタリングする。
 * タグが存在しないアイテム、および excludeTags に含まれるタグを持つアイテムは除外する。
 * @param excludeTags 除外タグの配列
 * @returns フィルタ済みアイテム、タググループ、除外件数
 */
export async function collectItems(excludeTags: string[]): Promise<{
  items: EagleItem[];
  tagGroups: EagleTagGroup[];
  excludedCount: number;
}> {
  const rawItems = await eagle.item.get({
    fields: ['id', 'name', 'ext', 'filePath', 'tags']
  });
  const rawGroups = await eagle.tagGroup.get();

  const excludeSet = new Set(excludeTags);
  let excludedCount = 0;

  const items: EagleItem[] = [];
  for (const r of rawItems) {
    // タグが空のアイテムはスキップ (除外カウント対象外)
    if (r.tags.length === 0) continue;
    // 除外タグに該当するアイテムはカウントして除外する
    const hitExclude = r.tags.some((t) => excludeSet.has(t));
    if (hitExclude) {
      excludedCount++;
      continue;
    }
    items.push({
      id: r.id,
      name: r.name,
      ext: r.ext,
      filePath: r.filePath,
      tags: [...r.tags]
    });
  }

  const tagGroups: EagleTagGroup[] = rawGroups.map((g) => ({
    name: g.name,
    tags: [...g.tags]
  }));

  return { items, tagGroups, excludedCount };
}
