<script setup lang="ts">
defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

function openSettings(): void {
  (globalThis as Window & typeof globalThis).open('ms-settings:developers', '_blank');
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :append-to-body="true"
    @update:model-value="(v: boolean) => !v && emit('close')"
  >
    <h3>Windows 開発者モード</h3>
    <p>シンボリックリンクの作成には Windows 開発者モードの有効化が必要です。</p>
    <div class="link-row">
      <el-button link @click="openSettings">Windows 設定を開く</el-button>
    </div>
    <p>有効化済みの場合は、このまま続行できます。</p>
    <div class="actions">
      <el-button type="primary" @click="emit('close')">確認</el-button>
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
}
.link-row {
  margin: 4px 0;
}
.actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
