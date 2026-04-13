<script setup lang="ts">
defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

function openSettings() {
  (globalThis as Window & typeof globalThis).open('ms-settings:developers', '_blank');
}
</script>

<template>
  <div v-if="visible" class="dialog-overlay" role="dialog">
    <div class="dialog-box">
      <h3>Windows 開発者モード</h3>
      <p>シンボリックリンクの作成には Windows 開発者モードの有効化が必要です。</p>
      <button class="link" @click="openSettings">Windows 設定を開く</button>
      <p>有効化済みの場合は、このまま続行できます。</p>
      <div class="actions">
        <button class="primary" @click="emit('close')">確認</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: var(--box-overlay-background);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog-box {
  min-width: 400px;
  padding: 16px;
  border-radius: 8px;
  background: var(--color-bg-primary);
  box-shadow: var(--box-border-shadow);
  h3 {
    margin: 0 0 8px;
    font-size: 14px;
  }
  p {
    font-size: 12px;
    margin: 4px 0;
  }
  .link {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    text-decoration: underline;
  }
  .actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
    button {
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid var(--color-border-primary);
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      &.primary {
        background: var(--color-primary);
        color: var(--color-white);
      }
    }
  }
}
</style>
