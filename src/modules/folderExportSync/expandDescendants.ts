/**
 * ツリーの指定ノード配下 (自分自身を含む) のすべての ID を再帰的に集める。
 * 除外指定を子孫展開するユースケースに使う。
 */
export function expandDescendants<T extends { id: string; children: T[] }>(
  tree: T[],
  rootIds: string[]
): Set<string> {
  const lookup = new Map<string, T>();
  const indexAll = (nodes: T[]): void => {
    for (const node of nodes) {
      lookup.set(node.id, node);
      indexAll(node.children);
    }
  };
  indexAll(tree);

  const result = new Set<string>();
  const walk = (node: T): void => {
    if (result.has(node.id)) return;
    result.add(node.id);
    for (const child of node.children) walk(child);
  };
  for (const id of rootIds) {
    const node = lookup.get(id);
    if (node) walk(node);
  }
  return result;
}
