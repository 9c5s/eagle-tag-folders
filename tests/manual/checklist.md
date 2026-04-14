# 手動 E2E チェックリスト

## 環境準備

- [ ] Windows: 開発者モードが有効
- [ ] Eagle 4.0 build22 以上で起動している (build21 以下は UnsupportedScreen 系チェックで別途検証)
- [ ] Eagle にテスト用ライブラリを用意 (10 / 1,000 / 10,000 件の 3 パターン)
- [ ] 通常フォルダ / スマートフォルダ / タグなしアイテム / どちらにも属さないアイテムが混在するライブラリを 1 つ以上用意
- [ ] プラグインをインストール (Eagle の設定 > プラグイン > フォルダから読み込み)

## 基本動作

- [ ] 空のライブラリでプレビュー → 「対象 0 件」でエラーにならない
- [ ] 10 件のライブラリで同期 → 出力先に symlink が生成される
- [ ] 作成された symlink から元ファイルが開ける
- [ ] 再同期 → 既存を置換、`eagle-folder-export.old-*` が残る

## カテゴリパターン

- [ ] 通常フォルダ階層が `<root>/eagle-folder-export/folders/` 配下に再現される
- [ ] スマートフォルダ階層が `<root>/eagle-folder-export/smart-folders/` 配下に再現される
- [ ] `categories.all=true` で `<root>/eagle-folder-export/all/` 配下に全アイテムがフラットに並ぶ
- [ ] `categories.untagged=true` で `<root>/eagle-folder-export/untagged/` 配下にタグなしアイテムが並ぶ
- [ ] `categories.uncategorized=true` で `<root>/eagle-folder-export/uncategorized/` 配下に通常フォルダ/スマートフォルダ両方に未所属のアイテムが並ぶ
- [ ] 除外フォルダに指定したサブツリーは `folders/` に出ず、`all/` などには残る
- [ ] 除外スマートフォルダも同様に `smart-folders/` のみから除外される
- [ ] Eagle ロケール `ja` / `en` 切替でディレクトリ名が変わる (`フォルダ/` vs `folders/` 等)
- [ ] Eagle build21 以下 (dev eagleMock で `eagle.app.build = 21` 注入 or Eagle 旧版起動) で起動すると以下を全て満たす:
  - `UnsupportedScreen` が画面全体に表示される
  - `MainPanel` / 設定サイドバー / プレビューパネル / 同期ボタン / `CleanupOldDirsButton` 等の通常 UI が一切 render されない
  - プレビューや同期を走らせる手段が存在せず、ユーザーが取れる操作はウィンドウを閉じるのみ

## 実機検証項目 (spec §13 由来)

- [ ] `eagle.item.get({ folders: [id1, id2, ...] })` の複数指定が OR 挙動であることを確認 (1 アイテムが複数フォルダに属するシナリオで、両フォルダ列挙で 1 件取れる)
- [ ] `eagle.item.get({ folders: [...大量の id] })` で暗黙の上限に当たらないか確認 (100 件級のフォルダ指定で回してエラー無し)
- [ ] `eagle.folder.getAll()` / `eagle.smartFolder.getAll()` の返却値がルート配列 (children プロパティでネスト) であることを確認
- [ ] `Folder.parent` / `SmartFolder.parent` がルートノードでどう表現されるか (空文字 / null / undefined のいずれ) を記録
- [ ] `Item.folders` にスマートフォルダ ID が含まれないこと (通常フォルダのみ) を確認
- [ ] `eagle.item.get({ fields: [...] })` フィルタなし呼び出しで全件返却されることを確認
- [ ] `eagle.smartFolder` が build22+ で必ず定義されていることを確認 (`typeof eagle.smartFolder !== 'undefined'`)
- [ ] `SmartFolder.getItems({ fields })` で要素が絞れることを確認
- [ ] `sf.getItems()` の返却要素が `Item` と同型か別 DTO か確認 (最低限 `id` が存在)

## エラーパス

- [ ] Windows 開発者モード無効で同期 → probe で EPERM → DevModeWarningDialog
- [ ] 書き込み不可の rootDir を指定 → fatal
- [ ] rootDir 未設定: プレビュー / 同期実行ボタンが共に非活性 (`opacity 0.5`) で押下できない
- [ ] rootDir 選択直後にプレビューボタンが活性化する (同期実行はプレビュー成功後に活性化)
- [ ] rootDir がシンボリックリンク → 拒否
- [ ] rootDir が home 直下 → 拒否
- [ ] rootDir が Eagle ライブラリと包含 → 拒否

## 同意フロー

- [ ] 既存の `eagle-folder-export` が目印ファイル (`.managed-by-eagle.json`) なし → FirstTimeConsentDialog 表示
- [ ] 「別のルートディレクトリを選択」で設定に戻れる
- [ ] 「続行」で管理下になる (目印ファイルが書かれ、以降は同意なしで上書きされる)

## 性能

- [ ] 10,000 件のフル同期時間を測定 (Windows / macOS / Linux 各 1 回)
- [ ] 並列度 4 / 8 / 16 / 32 で比較
- [ ] interleaveByDir あり/なしで比較

## UI

- [ ] テーマ変更 (Eagle 設定から) → プラグインに即反映
- [ ] esc でウィンドウ閉じる、同期中は ExitConfirmDialog
- [ ] 旧バージョンを削除 → cleanupOldDirs が動く

### デザイン回帰 (Custom Export 風リファイン後)

- [ ] テーマ 6 種 (dark / gray / blue / purple / light / lightgray) すべてで色破綻がない
- [ ] サイドバー: 幅 300-320px、角丸 8px、半透明カード、ダーク時 box-shadow 目立ちすぎない
- [ ] サイドバーフッター: プレビュー (primary, 70%) と 同期実行 (primary, 30%) が横並び、gap 10px
- [ ] RootDirSetting: 長い絶対パス (`C:\Users\...\very\deep\path`) を指定しても 1 行にトリミングされ、ホバーで tooltip が全体を表示する
- [ ] CategoryToggleSetting: 5 つのスイッチ (folders / smartFolders / all / untagged / uncategorized) が縦並びで、トグル時に PlanSummary に即反映される
- [ ] ExcludedFoldersSetting / ExcludedSmartFoldersSetting: ツリーから複数選択でき、選択中の枝が `folders/` / `smart-folders/` から消えることがプレビューで確認できる
- [ ] NamingModeSetting: ラジオが 2 つ、チェック済みは primary 色、未チェックは透明
- [ ] CleanupOldDirsButton: フル幅、クリックで `ElMessageBox.confirm` が el-dialog と同寸で開く
- [ ] MainPanel: 各パネル (プレビュー / 進捗 / 結果) が border + border-radius 8px + padding 16px で統一
- [ ] SyncProgressPanel: `<el-progress>` のバーが primary 色、高さ 2px
- [ ] SyncResultPanel: エラー詳細の toggle が `<el-button text size="small">` で目立たない
- [ ] FirstTimeConsentDialog / DevModeWarningDialog / ExitConfirmDialog: overlay に backdrop-filter、本体 420px 幅、角丸 10px、`<el-button>` 配色が画面上のボタンと一致
- [ ] el-button disabled は opacity 0.5
- [ ] el-input フォーカス時に border-color が primary に変わる
- [ ] ウィンドウ最小幅 (約 600px) で SettingsRow のラベル/コントロールが崩れない

## ロケール

- [ ] Eagle を日本語にすると ja 翻訳が出る
- [ ] ja_JP が正規化されて ja にマッチする
- [ ] ロケール切替でカテゴリディレクトリ名 (`folders` ⇔ `フォルダ`、`smart-folders` ⇔ `スマートフォルダ` 等) が再同期で反映される
