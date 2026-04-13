import en from '../../public/_locales/en.json';
import ja from '../../public/_locales/ja.json';
import type { App } from 'vue';

const locales: Record<string, unknown> = { en, ja };

export function installI18n(app: App) {
  const raw =
    (globalThis as unknown as { eagle?: { app?: { locale?: string } } }).eagle?.app?.locale ?? 'en';
  const lang = raw.toLowerCase().split(/[-_]/)[0] ?? 'en';
  const messages = locales[lang] ?? locales['en'];

  app.config.globalProperties.$translate = (key: string, fallback?: string) => {
    return (
      key
        .split('.')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((o: any, k: string) => o?.[k], messages) ??
      fallback ??
      key
    );
  };
}
