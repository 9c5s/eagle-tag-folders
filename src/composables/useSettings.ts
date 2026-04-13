import { reactive, watch } from 'vue';
import { DEFAULT_SETTINGS, type Settings } from '@/modules/folderExportSync';
import { settingsKey } from '@/modules/folderExportSync/constants';

// 設定キャッシュ (同一セッション内でのロード重複を防ぐ)
let cache: Settings | null = null;

// テスト用にキャッシュを破棄する
export function _resetCacheForTest() {
  cache = null;
}

// localStorage のキーを生成する
function key(): string {
  const id =
    (globalThis as unknown as { eagle?: { plugin?: { manifest?: { id?: string } } } }).eagle?.plugin
      ?.manifest?.id ?? 'eagle-folder-export';
  return settingsKey(id);
}

// 旧形式 (Phase B 以前) の設定かを判定する。
// Phase B.3 の中間状態 (新 categories + 旧 excludeTags が共存する時期) でも
// 破棄されないよう、判定は「categories キーが無ければ旧形式」のみとする。
// J.2 で excludeTags フィールドが削除された後は、保存済みデータに excludeTags
// が残っていても Settings 型への spread merge で自然に捨てられる。
function isLegacy(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;
  return !('categories' in obj);
}

// localStorage から設定を読み込む
export function loadSettings(): Settings {
  if (cache !== null) return cache;
  try {
    const raw = localStorage.getItem(key());
    if (raw === null) {
      cache = { ...DEFAULT_SETTINGS };
      return cache;
    }
    const parsed = JSON.parse(raw);
    if (isLegacy(parsed)) {
      localStorage.removeItem(key());
      cache = { ...DEFAULT_SETTINGS };
      return cache;
    }
    cache = { ...DEFAULT_SETTINGS, ...(parsed as Partial<Settings>) };
    return cache;
  } catch {
    cache = { ...DEFAULT_SETTINGS };
    return cache;
  }
}

// 設定を localStorage に書き込む
export function persistSettings(settings: Settings): void {
  try {
    localStorage.setItem(key(), JSON.stringify(settings));
    cache = { ...settings };
  } catch (err) {
    console.warn('persistSettings failed:', err);
  }
}

// 設定のリアクティブオブジェクトを返す composable
export function useSettings() {
  const settings = reactive<Settings>(loadSettings());
  watch(settings, (v) => persistSettings(v as Settings), { deep: true });
  return { settings };
}
