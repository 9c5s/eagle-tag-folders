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

const FIELDS = ['id', 'name', 'ext', 'filePath', 'tags', 'folders'] as const;

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

function toItem(raw: {
  id: string;
  name: string;
  ext: string;
  filePath: string;
  tags: string[];
  folders: string[];
}): EagleItem {
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
 * 不要な API 呼び出しは避け、sf.getItems() は smart-folders と uncategorized の
 * 両方が ON でも 1 回ずつしか呼ばない (sfItemsCache に載せて使い回す)。
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

  const itemsMap = new Map<string, EagleItem>();
  let unfiledItems: EagleItem[] = [];

  const mergeItems = (raw: Array<Parameters<typeof toItem>[0]>) => {
    for (const r of raw) {
      if (!itemsMap.has(r.id)) itemsMap.set(r.id, toItem(r));
    }
  };

  if (settings.categories.all) {
    const raw = await eagle.item.get({ fields: [...FIELDS] });
    mergeItems(raw as unknown as Array<Parameters<typeof toItem>[0]>);
  } else {
    if (settings.categories.folders) {
      const activeFolderIds = flattenIds(folderTree).filter((id) => !excludedFolderSet.has(id));
      if (activeFolderIds.length > 0) {
        const raw = await eagle.item.get({ folders: activeFolderIds, fields: [...FIELDS] });
        mergeItems(raw as unknown as Array<Parameters<typeof toItem>[0]>);
      }
    }
    if (settings.categories.untagged) {
      const raw = await eagle.item.get({ isUntagged: true, fields: [...FIELDS] });
      mergeItems(raw as unknown as Array<Parameters<typeof toItem>[0]>);
    }
  }

  if (settings.categories.uncategorized) {
    const raw = await eagle.item.get({ isUnfiled: true, fields: [...FIELDS] });
    const list = (raw as unknown as Array<Parameters<typeof toItem>[0]>).map(toItem);
    unfiledItems = list;
    if (!settings.categories.all) {
      mergeItems(raw as unknown as Array<Parameters<typeof toItem>[0]>);
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
          const raw = await sf.getItems({ fields: [...FIELDS] });
          return [
            sf.id,
            (raw as unknown as Array<Parameters<typeof toItem>[0]>).map(toItem)
          ] as const;
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
