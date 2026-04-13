# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Eagle (画像・素材管理アプリ) のプラグイン。ライブラリ内アイテムが属する通常フォルダ / スマートフォルダ / 仮想カテゴリ (all / untagged / uncategorized) を元に、OS のファイルシステム上へディレクトリ階層を構築し、実ファイルへのシンボリックリンクを配置する。MVP は**手動フル同期のみ** (差分同期は将来拡張)。

- Eagle ランタイム: **Chromium 107 + Node.js 16**
- 開発マシン: Node.js 18+ 推奨 (ビルドは新しい Node でよい)
- 対応 OS: Windows (開発者モード必須) / macOS / Linux

## 主要コマンド

```bash
npm install                              # 依存 + lefthook install
npm run dev                              # Vite 開発サーバー
npm run build                            # vue-tsc --noEmit + vite build
npm run typecheck                        # 型チェックのみ
npm run lint                             # eslint --fix
npm run lint:check                       # eslint (read-only)
npm run format                           # prettier --write
npm run test                             # Vitest 全テスト (unit + integration)
npm run test:watch                       # Vitest watch
npm run test:coverage                    # v8 カバレッジ

npx vitest run tests/unit/sanitize.test.ts        # 単一ファイル
npx vitest run -t "Windows 予約名"                 # test名で絞り込み
```

## アーキテクチャ (big picture)

### レイヤ境界 (厳守)

1. **`src/modules/folderExportSync/`** - ビジネスロジック、**Vue に依存しない純粋 TS**
   - Node.js API (`fs`, `path`, `os`) と Eagle API (`eagle.*`) のみ使用可
   - Vue の `ref`/`reactive` をここで使わない
   - Unit/Integration テストはこのディレクトリに対してのみ書く
2. **`src/composables/`** - Vue リアクティブ状態管理のみ
   - ビジネスロジックを書かない (モジュールを呼び出すだけ)
3. **`src/components/`** - Element Plus ベースの UI
   - `inject('settings')` で設定を受け取る

### 破壊的操作の境界 (絶対に逸脱しない)

- ユーザー指定の `rootDir` は**既存ディレクトリ必須**、直接は触らない
- プラグインが書き込むのは `<rootDir>/<MANAGED_SUBDIR>` 配下の 4 種のみ:
  - `managedDir` = `<rootDir>/eagle-folder-export/` (本体)
  - `stagingDir` = `<rootDir>/eagle-folder-export.staging-<ts>/` (書込中)
  - `oldDir` = `<rootDir>/eagle-folder-export.old-<ts>/` (swap 退避、**自動削除しない**)
  - `probeDir` = `<rootDir>/eagle-folder-export.probe-<ts>/` (symlink 可否検査)
- `MANAGED_SUBDIR` は定数 (`src/modules/folderExportSync/constants.ts`)、**UI から変更不可**
- Eagle ライブラリ (`eagle.library.path`) に**書き込んではいけない** (probe も既存ファイルへのリンクのみ)
- `rootDir` が reparse point / symlink / junction / home 直下 / システムクリティカルパスの場合は fatal 拒否

### 2 フェーズ実行モデル

```
buildPlan(settings, BuildPlanCallbacks)
   └─> collect (eagle.folder.getAll + eagle.smartFolder.getAll + eagle.item.get + sf.getItems) → plan (sanitize + budget + 衝突解決)
   return { summary, plans }   ※ fs 書き込みゼロ

execute(plans, settings, ExecutionCallbacks)
   └─> validate (9 項目) → write (staging) → swap (atomic rename) → done
   return SyncResult (rolledBack / oldDir 含む)
```

- `buildPlan` / `execute` は独立した公開 API。callback 契約も別 (`BuildPlanCallbacks` / `ExecutionCallbacks`)
- `execute` は `try/catch/finally` でロールバック。`rolledBack: true` は **実際に復旧処理が成功した場合のみ**
- `SyncError.phase` は `collect | plan | write | swap | marker` (仕様書 2.1 準拠、`validate` は `marker` に統合)

## テスト方針

- **Unit テスト** (`tests/unit/`): 純粋関数 (sanitize, resolveHierarchy, expandDescendants, categoryNames, planBuilder, errorClassifier, interleaveByDir, collectItems, versionGuard)
- **Integration テスト** (`tests/integration/`): fs 実操作 (marker, probe, writer, swap, cleanupLeftovers, orchestrator)
  - tmp ディレクトリを `mkdtemp` で作成、`afterEach` で `fs.rm` 削除
  - **Windows 開発者モード無効時は `EPERM` を catch して `return` でスキップ** (必須パターン)
- `fs` モジュールを `vi.spyOn` でモックすると ESM の `Cannot redefine property` エラーになるため、`probeSymlinkCapability` は `FsOps` 依存性注入を採用

## コード規約

- **Conventional Commits** 準拠、`commitlint.config.ts` の `scope-empty: [2, 'always']` により scope 禁止 (`feat:` は OK、`feat(ui):` は NG)
- **コミットメッセージの subject は日本語**、type は英語 (`feat`, `fix`, `chore`, `test`, `docs`, `refactor` 等)
- **lefthook hooks** (全コミットで必ず通す、`--no-verify` 禁止):
  - `pre-commit`: eslint --fix + prettier --write + vue-tsc --noEmit + vitest run
  - `commit-msg`: commitlint
- `tsconfig.json` は `target: "ES2021"`, `strict: true`, `noUncheckedIndexedAccess: true` - 配列アクセスは `arr[0]!` または `?? default` で明示
- ESLint globals に `eagle` (readonly) を設定済み。`window` / `prompt` / `confirm` 等は `(globalThis as Window & typeof globalThis).xxx` で使う (v10 の no-undef 対策)

## 依存バージョン運用上の注意

- `@types/node@^20` を採用 (Vite 8 / Vitest 4 の peer dep と整合)
- **ただし Node 18+ 固有 API は `src/` で使用禁止** (Eagle ランタイムが Node 16 のため)
  - 禁止例: `fs.cp`, `fs.promises.cp`, `stream/web`, `node:test`, `readline/promises` の一部
  - 許可: `fs`, `path`, `os`, `url`, `util` の Node 16 互換 API のみ
- `typescript-eslint@^8.58.0` (v9 は未リリース、umbrella パッケージ採用)
- `typescript@^6` の `baseUrl` 非推奨警告対応で `tsconfig.json` に `ignoreDeprecations: "6.0"` を設定済み

## Eagle Plugin API

- 型定義: `src/types/eagle.d.ts` は**検証済み最小 subset**。公式 docs https://developer.eagle.cool/plugin-api
- 追加メンバーが必要なら**公式 docs で型を確認してから**追記
- `onPluginBeforeExit` は通知専用で `preventDefault()` できない → 終了抑止は `window.onbeforeunload` で行う
- `eagle.item.get({ fields: [...] })` を優先 (大量ライブラリで `getAll()` は非推奨)

## ドキュメント (git 管理外)

- `docs/superpowers/specs/` - 設計書 (ブレスト成果物、各開発者ローカル)
- `docs/superpowers/plans/` - 実装計画 (TDD スタイル、各タスクに完全なコード例)
- `tests/manual/checklist.md` - Eagle 実機での手動 E2E 確認項目

設計判断の背景や「なぜこうなっているか」は上記ドキュメントを参照。
