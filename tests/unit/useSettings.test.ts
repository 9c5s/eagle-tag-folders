import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, _resetCacheForTest } from '@/composables/useSettings';

// vitest の Node 環境では localStorage が未定義である。
// 最小の Map ベース shim を beforeEach で注入する (@vue/test-utils / happy-dom を導入しない方針)。
function installLocalStorageShim(): void {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null
  };
  (globalThis as unknown as { localStorage: unknown }).localStorage = shim;
}

beforeEach(() => {
  installLocalStorageShim();
  _resetCacheForTest?.();
  (globalThis as unknown as { eagle?: unknown }).eagle = {
    plugin: { manifest: { id: 'pid-test' } }
  };
});

describe('loadSettings 旧形式破棄', () => {
  it('categories キーが無ければ破棄して DEFAULT を返す', () => {
    localStorage.setItem(
      'eagle.plugin.pid-test.setting',
      JSON.stringify({
        rootDir: '/tmp',
        excludeTags: ['a'],
        namingMode: 'suffix',
        sanitizeReplacement: '_'
      })
    );
    const s = loadSettings();
    expect(s.rootDir).toBe(null);
    expect(localStorage.getItem('eagle.plugin.pid-test.setting')).toBe(null);
  });

  it('categories がありかつ excludeTags も残る B.3 中間データは破棄しない (categories が判定基準)', () => {
    localStorage.setItem(
      'eagle.plugin.pid-test.setting',
      JSON.stringify({
        rootDir: '/tmp',
        excludeTags: ['x'],
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
      })
    );
    const s = loadSettings();
    expect(s.rootDir).toBe('/tmp');
  });

  it('新形式はそのまま読み込む', () => {
    const payload = {
      rootDir: '/tmp',
      namingMode: 'suffix',
      sanitizeReplacement: '_',
      categories: {
        folders: true,
        smartFolders: true,
        all: true,
        untagged: false,
        uncategorized: false
      },
      excludedFolderIds: ['f1'],
      excludedSmartFolderIds: []
    };
    localStorage.setItem('eagle.plugin.pid-test.setting', JSON.stringify(payload));
    const s = loadSettings();
    expect(s.rootDir).toBe('/tmp');
    expect(s.categories.all).toBe(true);
    expect(s.excludedFolderIds).toEqual(['f1']);
  });
});
