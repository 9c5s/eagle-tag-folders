# 手動 E2E チェックリスト

## 環境準備

- [ ] Windows: 開発者モードが有効
- [ ] Eagle にテスト用ライブラリを用意 (10 / 1,000 / 10,000 件の 3 パターン)
- [ ] プラグインをインストール (Eagle の設定 > プラグイン > フォルダから読み込み)

## 基本動作

- [ ] 空のライブラリでプレビュー → 「対象 0 件」でエラーにならない
- [ ] 10 件のライブラリで同期 → 出力先に symlink が生成される
- [ ] 作成された symlink から元ファイルが開ける
- [ ] 再同期 → 既存を置換、.old-\* が残る

## タグパターン

- [ ] タグ未所属のファイル → `<root>/eagle-tag-folders/<tag>/` に配置
- [ ] タググループ所属タグ → `<root>/eagle-tag-folders/<group>/<tag>/` に配置
- [ ] 1 タグが複数グループに所属 → 両方にコピーされる
- [ ] 同名ファイルが衝突 → サフィックス (2), (3) 付き

## エラーパス

- [ ] Windows 開発者モード無効で同期 → probe で EPERM → DevModeWarningDialog
- [ ] 書き込み不可の rootDir を指定 → fatal
- [ ] rootDir を未設定で同期 → ガード
- [ ] rootDir がシンボリックリンク → 拒否
- [ ] rootDir が home 直下 → 拒否
- [ ] rootDir が Eagle ライブラリと包含 → 拒否

## 同意フロー

- [ ] 既存の eagle-tag-folders が目印ファイルなし → FirstTimeConsentDialog 表示
- [ ] 「別のルートディレクトリを選択」で設定に戻れる
- [ ] 「続行」で管理下になる

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
- [ ] ExcludeTagsSetting: タグが追加され、閉じるボタンの hover が整える
- [ ] NamingModeSetting: ラジオが 2 つ、チェック済みは primary 色、未チェックは透明
- [ ] ConcurrencySetting: `<el-input-number>` の増減ボタンで値変更、下限 1 / 上限 64 でストップ、直接入力も反映
- [ ] CleanupOldDirsButton: フル幅、クリックで `ElMessageBox.confirm` が el-dialog と同寸で開く
- [ ] `パス入力...` クリック → `ElMessageBox.prompt` が開き、el-dialog と同寸 (border/backdrop-filter/padding/radius)
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
