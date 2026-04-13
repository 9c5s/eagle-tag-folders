/**
 * Eagle Plugin API 型定義 (最小検証済み subset)
 * 公式 docs: https://developer.eagle.cool/plugin-api
 * 追加が必要なメンバーは公式 docs で型を確認してから追記すること。
 *
 * 意図的に省いたメンバー:
 *  - Item: select(), open(), replaceFile(), refreshThumbnail(), setCustomThumbnail()
 *  - TagGroup: save(), remove(), addTags(), removeTags(), id
 *  - Folder 関連 (今回の機能では未使用)
 *  - screen, notification, contextMenu, clipboard, drag, shell, log
 *  - Tag 関連 (tag.get, tag.merge 等)
 *  - dialog.showSaveDialog / showMessageBox / showErrorBox (今回の機能では未使用)
 */
declare namespace Eagle {
  interface Item {
    readonly id: string;
    name: string;
    readonly ext: string;
    tags: string[];
    folders: string[];
    readonly filePath: string;
    readonly fileURL: string;
    readonly thumbnailPath: string;
    readonly size: number;
    annotation: string;
    readonly modifiedAt: number;
    importedAt: number;
    save(): Promise<void>;
    moveToTrash(): Promise<void>;
  }

  interface TagGroup {
    name: string;
    tags: string[];
    color?: string;
    description?: string;
  }

  interface Plugin {
    manifest: { id: string; version: string; name: string; logo: string };
    path: string;
  }

  interface App {
    readonly theme: 'Auto' | 'LIGHT' | 'LIGHTGRAY' | 'GRAY' | 'DARK' | 'BLUE' | 'PURPLE';
    readonly locale: string;
    isDarkColors(): boolean;
  }

  interface ItemGetOptions {
    tags?: string[];
    folders?: string[];
    ext?: string;
    fields?: Array<keyof Item>;
  }

  interface ShowOpenDialogOptions {
    title?: string;
    defaultPath?: string;
    buttonLabel?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: Array<
      | 'openFile'
      | 'openDirectory'
      | 'multiSelections'
      | 'showHiddenFiles'
      | 'createDirectory'
      | 'promptToCreate'
    >;
    message?: string;
  }

  interface ShowOpenDialogResult {
    canceled: boolean;
    filePaths: string[];
  }

  interface EagleAPI {
    item: {
      getAll(): Promise<Item[]>;
      getSelected(): Promise<Item[]>;
      get(opts?: ItemGetOptions): Promise<Item[]>;
      getById(id: string): Promise<Item | null>;
      getByIds(ids: string[]): Promise<Item[]>;
    };
    dialog: {
      showOpenDialog(options: ShowOpenDialogOptions): Promise<ShowOpenDialogResult>;
    };
    tagGroup: {
      get(): Promise<TagGroup[]>;
      create(opts: { name: string; tags?: string[] }): Promise<TagGroup>;
    };
    library: {
      readonly path: string;
      readonly name: string;
      info(): Promise<unknown>;
    };
    app: App;
    window: {
      setOpacity(value: number): Promise<void>;
    };
    plugin?: {
      manifest?: { id: string; version: string; name: string; logo: string };
      path?: string;
    };
    onPluginCreate(cb: (plugin: Plugin) => void): void;
    onPluginRun(cb: () => void): void;
    onPluginShow(cb: () => void): void;
    onPluginHide(cb: () => void): void;
    onPluginBeforeExit(cb: () => void): void;
    onThemeChanged(cb: () => void): void;
    onLibraryChanged(cb: (path: string) => void): void;
  }
}

declare const eagle: Eagle.EagleAPI;
