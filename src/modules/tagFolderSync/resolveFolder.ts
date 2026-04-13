import type { EagleItem, EagleTagGroup } from './types';

/**
 * 単一のタグが属するディレクトリを解決する。
 * タグがどのグループに所属しているかに基づいてディレクトリパスを決定する。
 * @param tag 対象のタグ名
 * @param groupsByTag タグからグループ名の配列へのマップ
 * @returns そのタグが配置されるべきディレクトリパスの配列
 */
export function resolveDirectories(tag: string, groupsByTag: Map<string, string[]>): string[] {
  const groups = groupsByTag.get(tag) ?? [];

  // グループに属していない場合は、タグ名そのもの
  if (groups.length === 0) {
    return [tag];
  }

  // グループに属している場合は、各グループ下のタグディレクトリ
  return groups.map((g) => `${g}/${tag}`);
}

/**
 * Eagle アイテムの全タグとグループの組み合わせからディレクトリパスを解決する。
 * 1 つのアイテムが複数のタグを持つ場合、各タグごとに
 * さらに複数のグループに属していることがあるため、複数のパスが生成される。
 * @param items Eagle アイテムの配列
 * @param tagGroups タググループの定義配列
 * @returns アイテム × ディレクトリパスのペアの配列
 */
export function resolveAllPaths(
  items: EagleItem[],
  tagGroups: EagleTagGroup[]
): Array<{ item: EagleItem; dir: string }> {
  // タググループから「タグ -> グループ名の配列」のマップを構築する
  const groupsByTag = new Map<string, string[]>();
  for (const g of tagGroups) {
    for (const t of g.tags) {
      const arr = groupsByTag.get(t) ?? [];
      arr.push(g.name);
      groupsByTag.set(t, arr);
    }
  }

  // 各アイテムの各タグについて、その属するディレクトリを解決
  const result: Array<{ item: EagleItem; dir: string }> = [];
  for (const item of items) {
    for (const tag of item.tags) {
      for (const dir of resolveDirectories(tag, groupsByTag)) {
        result.push({ item, dir });
      }
    }
  }

  return result;
}
