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

## ロケール

- [ ] Eagle を日本語にすると ja 翻訳が出る
- [ ] ja_JP が正規化されて ja にマッチする
