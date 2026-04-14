// src/plugins/i18n.ts で app.config.globalProperties に注入される翻訳関数の型。
// テンプレート内で {{ $translate('key.path', 'fallback') }} のように使用する。
import 'vue';

declare module 'vue' {
  interface ComponentCustomProperties {
    $translate: (key: string, fallback?: string) => string;
  }
}
