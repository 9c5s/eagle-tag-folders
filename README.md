# Eagle Folder Export

Eagle ライブラリ内アイテムが属する通常フォルダ / スマートフォルダ / 仮想カテゴリ (all / untagged / uncategorized) を元に、OS 上にディレクトリ階層を構築し、実ファイルへのシンボリックリンクを配置するプラグインです。

## 機能

- 通常フォルダ階層の再現 (`folders/`)
- スマートフォルダ階層の再現 (`smart-folders/`)
- 仮想カテゴリのフラット展開 (`all/` / `untagged/` / `uncategorized/`)
- 除外フォルダ / 除外スマートフォルダの指定
- 手動フル同期 (MVP、差分同期は将来拡張)
- Windows (開発者モード必須) / macOS / Linux 対応

## 開発

前提: Node.js 18+ と npm が開発マシンに入っていること (Eagle ランタイムは Node 16 だがビルド用は新しい Node で OK)。

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run lint       # lint (eslint + fix)
npm run typecheck  # 型チェック (vue-tsc)
npm test           # ユニット + 統合テスト
```

## アーキテクチャ

- `src/modules/folderExportSync/` — ビジネスロジック (Vue 非依存、純粋 TS)
- `src/components/` — Vue UI コンポーネント
- `src/composables/` — Vue 状態管理
- `public/manifest.json` — Eagle プラグインマニフェスト

## ドキュメント

- 設計書: `docs/superpowers/specs/` (git 管理外、開発者ローカルのみ)
- 実装計画: `docs/superpowers/plans/` (git 管理外)
- 手動 E2E チェックリスト: `tests/manual/checklist.md`

## ライセンス

未定 (個人プロジェクト、社内/個人利用のみ想定)
