// SCSS モジュールのサイドエフェクトインポートを TypeScript に認識させる宣言
declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}
