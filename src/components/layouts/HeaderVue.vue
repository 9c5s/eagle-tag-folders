<script setup lang="ts">
// Eagle プラグインのマニフェストからタイトルを取得する
const title =
  (globalThis as unknown as { eagle?: { plugin?: { manifest?: { name?: string } } } }).eagle?.plugin
    ?.manifest?.name ?? 'Tag Folders';

// ウィンドウを閉じる
function handleClose() {
  (globalThis as Window & typeof globalThis).close();
}
</script>

<template>
  <div class="header-vue">
    <div class="drag">
      <img class="logo" src="/logo.png" alt="logo" />
      <span class="title">{{ title }}</span>
    </div>
    <div class="action">
      <button class="close-btn" aria-label="close" @click="handleClose">×</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header-vue {
  position: relative;
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-border-secondary);
  user-select: none;

  .drag {
    -webkit-app-region: drag;
    flex: 1;
    height: 100%;
    display: flex;
    gap: 8px;
    align-items: center;

    .logo {
      width: 24px;
      height: 24px;
      border-radius: 6px;
    }
    .title {
      color: var(--color-text-primary);
      font-weight: var(--font-weight-bold);
      font-size: 14px;
    }
  }
  .action {
    display: flex;
    .close-btn {
      background: none;
      border: none;
      color: var(--color-text-primary);
      font-size: 20px;
      cursor: pointer;
      padding: 4px 12px;
    }
  }
}
</style>
