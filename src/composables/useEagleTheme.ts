import { ref, onMounted } from 'vue';

// Eagle アプリのテーマに追従する composable
export function useEagleTheme() {
  const eagleTheme = ref<string>('light');

  // Eagle のテーマ値を DOM 属性に反映する
  const update = () => {
    const theme = eagle.app.theme;
    const map: Record<string, string> = {
      Auto: eagle.app.isDarkColors() ? 'dark' : 'light',
      LIGHT: 'light',
      LIGHTGRAY: 'lightgray',
      GRAY: 'gray',
      DARK: 'dark',
      BLUE: 'blue',
      PURPLE: 'purple'
    };
    eagleTheme.value = map[theme] ?? 'light';
    document.documentElement.setAttribute('theme', eagleTheme.value);
    const proc = (globalThis as { process?: { platform?: string } }).process;
    document.documentElement.setAttribute('platform', proc?.platform ?? 'web');
  };

  onMounted(() => {
    update();
    eagle.onThemeChanged(update);
  });

  return { eagleTheme };
}
