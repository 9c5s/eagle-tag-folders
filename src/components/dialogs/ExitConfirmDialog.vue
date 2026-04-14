<script setup lang="ts">
defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'stay'): void;
  (e: 'force-exit'): void;
}>();
</script>

<template>
  <el-dialog
    :model-value="visible"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :append-to-body="true"
    @update:model-value="(v: boolean) => !v && emit('stay')"
  >
    <h3>確認</h3>
    <p>
      同期が進行中です。今ウィンドウを閉じると中断され、staging ディレクトリが残ります
      (次回起動時に自動削除されます)。
    </p>
    <div class="actions">
      <el-button @click="emit('stay')">戻る (同期を続ける)</el-button>
      <el-button type="danger" @click="emit('force-exit')">閉じる</el-button>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
h3 {
  margin: 0 0 8px;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}
p {
  font-size: var(--font-size-sm);
  margin: 4px 0;
  color: var(--color-text-primary);
  line-height: 1.6;
}
.actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
