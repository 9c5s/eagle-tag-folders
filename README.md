# Eagle Tag Folders

Eagle ライブラリのアイテムに付与されたタグとタググループから、OS 上にディレクトリ階層を構築し、実ファイルへのシンボリックリンクを配置するプラグインです。

## 機能

- タグ名フォルダの自動生成
- タググループを上位ディレクトリに展開
- 手動フル同期 (MVP)
- Windows (開発者モード) / macOS / Linux 対応

## 開発

前提: Node.js 18+ と npm が開発マシンに入っていること (Eagle ランタイムは Node 16 だがビルド用は新しい Node でOK)。

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run lint       # lint (eslint + fix)
npm run typecheck  # 型チェック (vue-tsc)
npm test           # ユニット + 統合テスト
```

## アーキテクチャ

- `src/modules/tagFolderSync/` — ビジネスロジック (Vue 非依存、純粋 TS)
- `src/components/` — Vue UI コンポーネント
- `src/composables/` — Vue 状態管理
- `public/manifest.json` — Eagle プラグインマニフェスト

## ドキュメント

- 設計書: `docs/superpowers/specs/` (git 管理外、開発者ローカルのみ)
- 実装計画: `docs/superpowers/plans/` (git 管理外)
- 手動 E2E チェックリスト: `tests/manual/checklist.md`

## ライセンス

未定 (個人プロジェクト、社内/個人利用のみ想定)
