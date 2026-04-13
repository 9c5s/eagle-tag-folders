// Vite dev 環境で Eagle API が存在しない際のモック。本番ビルドでは tree-shake で除外される想定。
export function installEagleMock(): void {
  const noop = (): void => {};
  const mock = {
    plugin: {
      manifest: { id: 'dev', version: '0.0.0-dev', name: 'Tag Folders (dev)', logo: '/logo.png' },
      path: '/dev'
    },
    window: {
      setOpacity: async (_v: number): Promise<void> => {}
    },
    app: {
      theme: 'DARK' as const,
      locale: 'ja',
      isDarkColors: (): boolean => true
    },
    library: {
      path: '',
      name: 'Dev Library',
      info: async (): Promise<unknown> => ({})
    },
    item: {
      getAll: async (): Promise<unknown[]> => [],
      getSelected: async (): Promise<unknown[]> => [],
      get: async (): Promise<unknown[]> => [],
      getById: async (): Promise<unknown> => null,
      getByIds: async (): Promise<unknown[]> => []
    },
    tagGroup: {
      get: async (): Promise<unknown[]> => [],
      create: async (opts: { name: string; tags?: string[] }): Promise<unknown> => ({
        name: opts.name,
        tags: opts.tags ?? []
      })
    },
    onPluginCreate: (cb: (plugin: unknown) => void): void => {
      queueMicrotask(() => cb({ manifest: mock.plugin.manifest, path: mock.plugin.path }));
    },
    onPluginRun: (cb: () => void): void => {
      queueMicrotask(cb);
    },
    onPluginShow: noop,
    onPluginHide: noop,
    onPluginBeforeExit: noop,
    onThemeChanged: noop,
    onLibraryChanged: noop
  };
  (globalThis as { eagle?: unknown }).eagle = mock;
}
