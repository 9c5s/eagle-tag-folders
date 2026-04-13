import { createApp, reactive, toRaw } from 'vue';
import ElementPlus from 'element-plus';
import App from './views/App.vue';
import { installI18n } from './plugins/i18n';
import { loadSettings, persistSettings } from './composables/useSettings';
import { cleanupLeftovers } from './modules/folderExportSync';
import type { Settings } from './modules/folderExportSync';
import { useSyncState } from './composables/useSyncState';
import './assets/styles/main.scss';

// Vite dev でブラウザ単体起動する際のフォールバック。production では tree-shake される
if (import.meta.env.DEV && typeof (globalThis as { eagle?: unknown }).eagle === 'undefined') {
  const { installEagleMock } = await import('./dev/eagleMock');
  installEagleMock();
}

let bootedSettings: Settings | null = null;

async function bootstrap() {
  const settings = reactive(loadSettings()) as Settings;
  await cleanupLeftovers(settings.rootDir);
  const app = createApp(App);
  app.use(ElementPlus);
  installI18n(app);
  app.provide('settings', settings);
  app.mount('#app');
  bootedSettings = settings;
}

eagle.onPluginCreate(async () => {
  await eagle.window.setOpacity(0);
  await bootstrap();
});

eagle.onPluginRun(async () => {
  await new Promise((r) => setTimeout(r, 50));
  await eagle.window.setOpacity(1);
});

eagle.onLibraryChanged(() => {
  (globalThis as Window & typeof globalThis).close();
});

eagle.onPluginBeforeExit(() => {
  if (bootedSettings !== null) persistSettings(toRaw(bootedSettings));
});

(globalThis as Window & typeof globalThis).addEventListener('beforeunload', (event) => {
  const st = useSyncState();
  if (st.state.value === 'Syncing') {
    st.openDialog('exitConfirm');
    event.preventDefault();
    event.returnValue = '同期中です。終了するとデータが破損する可能性があります。';
    return event.returnValue;
  }
});
