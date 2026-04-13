import type { EagleItem } from './types';

export type HierarchyNode<T> = T & { children: HierarchyNode<T>[] };

export type ItemDirPair = {
  item: EagleItem;
  dir: string[]; // セグメント配列 (例: ['folders', 'Alpha', 'A-one'])
};

type IdNamedNode = { id: string; name: string; children: IdNamedNode[] };

/**
 * 通常フォルダツリーを深さ優先で下り、各ノードに所属するアイテムを
 * Item.folders から逆引きして (item, dir) ペアを生成する。
 * 除外セットに含まれるノードはサブツリーごと飛ばす。
 */
export function buildFolderPairs(
  tree: IdNamedNode[],
  items: EagleItem[],
  excluded: Set<string>,
  rootSegments: string[]
): ItemDirPair[] {
  const pairs: ItemDirPair[] = [];
  const walk = (node: IdNamedNode, prefix: string[]): void => {
    if (excluded.has(node.id)) return;
    const dir = [...prefix, node.name];
    for (const it of items) {
      if (it.folders.includes(node.id)) {
        pairs.push({ item: it, dir });
      }
    }
    for (const child of node.children) walk(child, dir);
  };
  for (const root of tree) walk(root, rootSegments);
  return pairs;
}

/**
 * スマートフォルダツリーを深さ優先で下り、sfItemsCache を使って
 * 各ノードに対応するアイテムを配置する。
 */
export function buildSmartFolderPairs(
  tree: IdNamedNode[],
  cache: Map<string, EagleItem[]>,
  excluded: Set<string>,
  rootSegments: string[]
): ItemDirPair[] {
  const pairs: ItemDirPair[] = [];
  const walk = (node: IdNamedNode, prefix: string[]): void => {
    if (excluded.has(node.id)) return;
    const dir = [...prefix, node.name];
    const items = cache.get(node.id) ?? [];
    for (const it of items) pairs.push({ item: it, dir });
    for (const child of node.children) walk(child, dir);
  };
  for (const root of tree) walk(root, rootSegments);
  return pairs;
}

/**
 * all / untagged / uncategorized 用のフラット配置。
 * 単一セグメント配下に全アイテムを並べる。
 */
export function buildFlatPairs(items: EagleItem[], rootSegments: string[]): ItemDirPair[] {
  return items.map((item) => ({ item, dir: rootSegments }));
}
