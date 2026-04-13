import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import tailwindcss from '@tailwindcss/vite';

// Eagle は Electron renderer + nodeIntegration 有効環境だが
// <script type="module"> では `node:*` 形式の specifier を解決できない。
// build 時に `import * as X from 'node:Y'` と `await import('node:Y')` を
// `globalThis.require('Y')` 経由の参照に書き換えて、Electron の Node 統合に委ねる。
// dev/test ではそのまま通し、Vite / Vitest の Node 解決機構で動作させる。
function electronNodeBuiltins(): Plugin {
  const staticRe = /import\s+\*\s+as\s+(\w+)\s+from\s+(['"])node:([\w/]+)\2\s*;?/g;
  const dynamicRe = /import\(\s*(['"])node:([\w/]+)\1\s*\)/g;
  return {
    name: 'electron-node-builtins',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('/node_modules/')) return null;
      if (!/\.(ts|js|mjs|vue)(\?|$)/.test(id)) return null;
      let changed = false;
      let out = code.replace(staticRe, (_, alias: string, _q, mod: string) => {
        changed = true;
        return `const ${alias} = globalThis.require(${JSON.stringify(mod)});`;
      });
      out = out.replace(dynamicRe, (_, _q, mod: string) => {
        changed = true;
        return `Promise.resolve(globalThis.require(${JSON.stringify(mod)}))`;
      });
      return changed ? { code: out, map: null } : null;
    }
  };
}

// 並列度実測用の perf ログ書き込み先。開発者ローカルの .env.local で
// VITE_PERF_LOG_DIR に絶対パスを設定した場合のみ有効化する。
// 未設定 (空文字) の場合は計測ログを書き出さない (本番配布時の既定挙動)。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const perfLogDir = env.VITE_PERF_LOG_DIR ?? '';
  return {
    base: './',
    define: {
      __PERF_LOG_DIR__: JSON.stringify(perfLogDir)
    },
    build: {
      sourcemap: false,
      minify: false,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash][extname]'
        }
      }
    },
    plugins: [
      electronNodeBuiltins(),
      vue(),
      tailwindcss(),
      AutoImport({
        imports: ['vue'],
        resolvers: [ElementPlusResolver()]
      }),
      Components({
        dirs: ['src/components/**', 'src/views/**'],
        resolvers: [ElementPlusResolver()]
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/assets/styles', import.meta.url))
      }
    }
  };
});
