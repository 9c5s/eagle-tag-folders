<script setup lang="ts">
import { computed } from 'vue';
import { MANAGED_SUBDIR } from '@/modules/tagFolderSync';
const props = defineProps<{ visible: boolean; rootDir: string }>();
const emit = defineEmits<{
  (e: 'ok'): void;
  (e: 'change-root'): void;
  (e: 'cancel'): void;
}>();
const managedPath = computed(() => `${props.rootDir}/${MANAGED_SUBDIR}`);
</script>

<template>
  <el-dialog
    :model-value="visible"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :append-to-body="true"
    @update:model-value="(v: boolean) => !v && emit('cancel')"
  >
    <h3>確認</h3>
    <p>以下のディレクトリが既に存在しますが、このプラグインの管理下ではありません。</p>
    <pre>{{ managedPath }}</pre>
    <p>続行するとこのディレクトリの内容は完全に置き換えられます。</p>
    <p>ルートディレクトリ直下の他のファイルには影響しません。</p>
    <div class="actions">
      <el-button @click="emit('change-root')">別のルートディレクトリを選択</el-button>
      <el-button type="primary" @click="emit('ok')">続行</el-button>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--color-text-primary);
}
p {
  font-size: 12px;
  margin: 4px 0;
  color: var(--color-text-primary);
}
pre {
  font-size: 11px;
  background: var(--color-bg-active);
  padding: 6px 8px;
  border-radius: 4px;
  word-break: break-all;
  margin: 6px 0;
  color: var(--color-text-secondary);
}
.actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
