import { vi } from 'vitest';

/**
 * globalThis.eagle を差し替える Eagle API モック。
 * テスト間で状態が漏れないよう beforeEach で呼び出すことを想定する。
 */
export function mockEagle(overrides?: Partial<Eagle.EagleAPI>) {
  const defaults = {
    item: {
      getAll: vi.fn().mockResolvedValue([]),
      getSelected: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue([]),
      getById: vi.fn(),
      getByIds: vi.fn()
    },
    folder: {
      getAll: vi.fn().mockResolvedValue([])
    },
    smartFolder: {
      getAll: vi.fn().mockResolvedValue([])
    },
    tagGroup: {
      get: vi.fn().mockResolvedValue([]),
      create: vi.fn()
    },
    library: { path: '/mock/library', name: 'mock', info: vi.fn() },
    app: {
      theme: 'LIGHT',
      locale: 'en_US',
      build: 99,
      isDarkColors: () => false
    },
    window: { setOpacity: vi.fn() },
    onPluginCreate: vi.fn(),
    onPluginRun: vi.fn(),
    onPluginShow: vi.fn(),
    onPluginHide: vi.fn(),
    onPluginBeforeExit: vi.fn(),
    onThemeChanged: vi.fn(),
    onLibraryChanged: vi.fn()
  } as unknown as Eagle.EagleAPI;
  const merged = { ...defaults, ...overrides };
  (globalThis as unknown as { eagle: Eagle.EagleAPI }).eagle = merged;
  return merged;
}
