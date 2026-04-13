// ---- ユーザー設定 (localStorage に永続化) ----
export type CategoryKey = 'folders' | 'smartFolders' | 'all' | 'untagged' | 'uncategorized';

export type Settings = {
  rootDir: string | null;
  excludeTags: string[];
  namingMode: 'suffix' | 'id';
  sanitizeReplacement: string;
  categories: Record<CategoryKey, boolean>;
  excludedFolderIds: string[];
  excludedSmartFolderIds: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  rootDir: null,
  excludeTags: [],
  namingMode: 'suffix',
  sanitizeReplacement: '_',
  categories: {
    folders: true,
    smartFolders: true,
    all: false,
    untagged: false,
    uncategorized: false
  },
  excludedFolderIds: [],
  excludedSmartFolderIds: []
};

// ---- 派生パス ----
export type ResolvedPaths = {
  rootDir: string;
  managedDir: string;
  stagingDir: string;
  oldDir: string;
  probeDir: string;
};

// ---- Eagle API から受け取る DTO ----
export type EagleItem = {
  id: string;
  name: string;
  ext: string;
  filePath: string;
  tags: string[];
  folders: string[];
};

export type EagleTagGroup = {
  name: string;
  tags: string[];
};

// ---- プラン中間表現 ----
export type SymlinkPlan = {
  itemId: string;
  sourcePath: string;
  destDir: string;
  destName: string;
  displayTag: string;
};

// ---- サマリ ----
export type PlanSummary = {
  itemCount: number;
  excludedItemCount: number; // 旧 (Phase J で削除)
  groupCount: number; // 旧
  tagCount: number; // 旧
  folderCount: number; // 新規
  smartFolderCount: number; // 新規
  excludedFolderCount: number; // 新規
  excludedSmartFolderCount: number; // 新規
  symlinkCount: number;
  collisionCount: number;
  sanitizedNames: Array<{ original: string; sanitized: string }>;
  warnings: string[];
};

// ---- 実行結果 ----
export type SyncResult = {
  success: boolean;
  createdCount: number;
  skippedCount: number;
  durationMs: number;
  errors: SyncError[];
  rolledBack: boolean;
  oldDir: string | null;
};

// ---- エラー情報 ----
// 設計書 2.1 準拠: validate は execute 内の前提チェックで発生するが、
// エラー分類上は 'marker' フェーズ扱いで統一する
export type SyncErrorPhase = 'collect' | 'plan' | 'write' | 'swap' | 'marker';

export type SyncError = {
  kind: 'fatal' | 'skipped';
  phase: SyncErrorPhase;
  itemId?: string;
  message: string;
  originalError?: Error;
};

// ---- コールバック契約 ----
export type BuildPlanPhase = 'collect' | 'plan' | 'done';
export type BuildPlanCallbacks = {
  onPhaseChange?: (phase: BuildPlanPhase) => void;
};

export type ExecutionPhase = 'validate' | 'write' | 'swap' | 'done';
export type ExecutionCallbacks = {
  onProgress?: (current: number, total: number, currentTag: string) => void;
  onError?: (error: SyncError) => void;
  onPhaseChange?: (phase: ExecutionPhase) => void;
};
