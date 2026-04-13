export function folderNode(
  id: string,
  name: string,
  children: Eagle.Folder[] = [],
  parent: string | null = null
): Eagle.Folder {
  return { id, name, parent, children } as Eagle.Folder;
}

export function smartFolderNode(
  id: string,
  name: string,
  getItemsResult: Array<{
    id: string;
    name?: string;
    ext?: string;
    filePath?: string;
    tags?: string[];
    folders?: string[];
  }> = [],
  children: Eagle.SmartFolder[] = [],
  parent: string | null = null
): Eagle.SmartFolder {
  return {
    id,
    name,
    parent,
    children,
    getItems: async () =>
      getItemsResult.map((r) => ({
        id: r.id,
        name: r.name ?? r.id,
        ext: r.ext ?? 'png',
        filePath: r.filePath ?? `/src/${r.id}.png`,
        tags: r.tags ?? [],
        folders: r.folders ?? []
      })) as unknown as Eagle.Item[]
  } as Eagle.SmartFolder;
}
