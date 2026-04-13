import { reactive, watch } from 'vue';
import { DEFAULT_SETTINGS, type Settings } from '@/modules/folderExportSync';
import { settingsKey } from '@/modules/folderExportSync/constants';

// 設定キャッシュ (同一セッション内でのロード重複を防ぐ)
let cache: Settings | null = null;

// localStorage のキーを生成する
function key(): string {
  const id =
    (globalThis as unknown as { eagle?: { plugin?: { manifest?: { id?: string } } } }).eagle?.plugin
      ?.manifest?.id ?? 'eagle-tag-folders';
  return settingsKey(id);
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
    const parsed = JSON.parse(raw) as Partial<Settings>;
    cache = {
      ...DEFAULT_SETTINGS,
      ...parsed
    };
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
