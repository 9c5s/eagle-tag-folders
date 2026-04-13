<script setup lang="ts">
defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'stay'): void;
  (e: 'force-exit'): void;
}>();
</script>

<template>
  <div v-if="visible" class="dialog-overlay" role="dialog">
    <div class="dialog-box">
      <h3>確認</h3>
      <p>
        同期が進行中です。今ウィンドウを閉じると中断され、staging ディレクトリが残ります
        (次回起動時に自動削除されます)。
      </p>
      <div class="actions">
        <button @click="emit('stay')">戻る (同期を続ける)</button>
        <button class="danger" @click="emit('force-exit')">閉じる</button>
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
  .actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    button {
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid var(--color-border-primary);
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      &.danger {
        background: var(--color-negative);
        color: var(--color-white);
      }
    }
  }
}
</style>
