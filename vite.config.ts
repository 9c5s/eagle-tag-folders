import { fileURLToPath, URL } from 'node:url';
import { createLogger, defineConfig, loadEnv, type Plugin } from 'vite';
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

  // Element Plus カスタムテーマが参照する Eagle 本体の runtime アセット
  // (Roboto フォント / Eagle UI アイコン SVG) は build 時に解決できないが、
  // Eagle プラグインとして起動すれば Eagle 側で提供される。意図どおりの未解決
  // 警告なのでロガー側でフィルタして抑止する。
  // 許可リスト外の警告は process.exitCode を 1 にして build を失敗扱いにし、
  // lefthook pre-commit で検知できるようにする。
  const logger = createLogger();
  const shouldSuppress = (msg: unknown): boolean =>
    typeof msg === 'string' &&
    msg.includes("didn't resolve at build time") &&
    (/images\/(light|dark)\//.test(msg) || msg.includes('fonts/roboto/'));
  const defaultWarn = logger.warn.bind(logger);
  const defaultWarnOnce = logger.warnOnce.bind(logger);
  logger.warn = (msg, options) => {
    if (shouldSuppress(msg)) return;
    defaultWarn(msg, options);
    process.exitCode = 1;
  };
  logger.warnOnce = (msg, options) => {
    if (shouldSuppress(msg)) return;
    defaultWarnOnce(msg, options);
    process.exitCode = 1;
  };

  return {
    base: './',
    customLogger: logger,
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
        },
        // Rollup 公式推奨の warning→error 昇格パターン。
        // Rollup パイプライン由来の警告 (missing exports, circular deps, plugin warnings 等)
        // は handler('error', log) で即 build 失敗にする。Vite 独自 logger 経由の警告は
        // 上の customLogger 側で process.exitCode を 1 にして網羅する。
        onLog(level, log, handler) {
          if (level === 'warn') {
            handler('error', log);
            return;
          }
          handler(level, log);
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
