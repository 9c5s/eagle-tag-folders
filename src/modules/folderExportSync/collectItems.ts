import { CONCURRENCY_SYMLINK } from './constants';
import { expandDescendants } from './expandDescendants';
import type {
  CollectResult,
  EagleFolderNode,
  EagleItem,
  EagleSmartFolderNode,
  Settings
} from './types';

type RawFolder = {
  id: string;
  name: string;
  parent: string | null;
  children: RawFolder[];
};

type RawSmartFolder = {
  id: string;
  name: string;
  parent: string | null;
  children: RawSmartFolder[];
  getItems: (opts?: { fields?: string[] }) => Promise<Array<{ id: string }>>;
};

type RawItem = {
  id: string;
  name: string;
  ext: string;
  filePath: string;
  tags: string[];
  folders: string[];
};

// Eagle API に folders/isUntagged/isUnfiled/fields のフィルタを渡すと plain
// object で返され、read-only getter の filePath が欠落するバグが観測された。
// 正確性のためフィルタも fields も一切指定せず、全件を Item インスタンスとして
// 受け取り、クライアント側で folders / tags 判定を行う。
function mapFolder<T extends { id: string; name: string; parent: string | null; children: T[] }>(
  node: T
): EagleFolderNode {
  return {
    id: node.id,
    name: node.name,
    parent: node.parent,
    children: node.children.map(mapFolder)
  };
}

function mapSmartFolder<
  T extends { id: string; name: string; parent: string | null; children: T[] }
>(node: T): EagleSmartFolderNode {
  return {
    id: node.id,
    name: node.name,
    parent: node.parent,
    children: node.children.map(mapSmartFolder)
  };
}

function flattenIds(tree: Array<{ id: string; children: unknown[] }>): string[] {
  const ids: string[] = [];
  const walk = (nodes: Array<{ id: string; children: unknown[] }>) => {
    for (const n of nodes) {
      ids.push(n.id);
      walk(n.children as Array<{ id: string; children: unknown[] }>);
    }
  };
  walk(tree);
  return ids;
}

function flattenNodes<T extends { children: T[] }>(tree: T[]): T[] {
  const out: T[] = [];
  const walk = (nodes: T[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(tree);
  return out;
}

function toItem(raw: RawItem): EagleItem {
  return {
    id: raw.id,
    name: raw.name,
    ext: raw.ext,
    filePath: raw.filePath,
    tags: [...raw.tags],
    folders: [...raw.folders]
  };
}

/**
 * カテゴリ設定に従って Eagle API を呼び、同期に必要なデータ一式を集める。
 * eagle.item.get は常に引数なしで呼び出し、クライアント側で folders/tags を
 * もとにフィルタする。sf.getItems の返却は id 参照として扱い、filePath 等の
 * 実体は全件キャッシュから補完する。
 */
export async function collectItems(settings: Settings): Promise<CollectResult> {
  const rawFolderTree = (await eagle.folder.getAll()) as unknown as RawFolder[];
  const rawSmartTree = (await eagle.smartFolder.getAll()) as unknown as RawSmartFolder[];
  const folderTree = rawFolderTree.map(mapFolder);
  const smartFolderTree = rawSmartTree.map(mapSmartFolder);

  const excludedFolderSet = expandDescendants(folderTree, settings.excludedFolderIds);
  const excludedSmartFolderSet = expandDescendants(
    smartFolderTree,
    settings.excludedSmartFolderIds
  );

  const allRaw = (await eagle.item.get({})) as unknown as RawItem[];
  const itemById = new Map<string, RawItem>();
  for (const r of allRaw) itemById.set(r.id, r);

  const itemsMap = new Map<string, EagleItem>();
  let unfiledItems: EagleItem[] = [];

  const mergeItems = (raw: RawItem[]) => {
    for (const r of raw) {
      if (!itemsMap.has(r.id)) itemsMap.set(r.id, toItem(r));
    }
  };

  if (settings.categories.all) {
    mergeItems(allRaw);
  } else {
    if (settings.categories.folders) {
      const activeFolderIds = flattenIds(folderTree).filter((id) => !excludedFolderSet.has(id));
      if (activeFolderIds.length > 0) {
        const activeSet = new Set(activeFolderIds);
        mergeItems(allRaw.filter((r) => r.folders.some((fid) => activeSet.has(fid))));
      }
    }
    if (settings.categories.untagged) {
      mergeItems(allRaw.filter((r) => r.tags.length === 0));
    }
  }

  if (settings.categories.uncategorized) {
    const unfiledRaw = allRaw.filter((r) => r.folders.length === 0);
    unfiledItems = unfiledRaw.map(toItem);
    if (!settings.categories.all) {
      mergeItems(unfiledRaw);
    }
  }

  const sfItemsCache = new Map<string, EagleItem[]>();
  if (settings.categories.smartFolders || settings.categories.uncategorized) {
    const flat = flattenNodes(rawSmartTree);
    const targets = flat.filter((sf) => {
      const forOutput = settings.categories.smartFolders && !excludedSmartFolderSet.has(sf.id);
      const forUncategorized = settings.categories.uncategorized;
      return forOutput || forUncategorized;
    });
    for (let i = 0; i < targets.length; i += CONCURRENCY_SYMLINK) {
      const batch = targets.slice(i, i + CONCURRENCY_SYMLINK);
      const batchResults = await Promise.all(
        batch.map(async (sf) => {
          const lightList = (await sf.getItems()) as unknown as Array<{ id: string }>;
          const enriched: EagleItem[] = [];
          for (const light of lightList) {
            const full = itemById.get(light.id);
            if (full !== undefined) enriched.push(toItem(full));
          }
          return [sf.id, enriched] as const;
        })
      );
      for (const [id, list] of batchResults) sfItemsCache.set(id, list);
    }
  }

  let uncategorizedItems: EagleItem[] = [];
  if (settings.categories.uncategorized) {
    const smartMatched = new Set<string>();
    for (const list of sfItemsCache.values()) {
      for (const it of list) smartMatched.add(it.id);
    }
    uncategorizedItems = unfiledItems.filter((it) => !smartMatched.has(it.id));
  }

  return {
    items: [...itemsMap.values()],
    folderTree,
    smartFolderTree,
    sfItemsCache,
    uncategorizedItems
  };
}
