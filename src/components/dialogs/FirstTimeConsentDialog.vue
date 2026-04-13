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
  <div v-if="visible" class="dialog-overlay" role="dialog">
    <div class="dialog-box">
      <h3>確認</h3>
      <p>以下のディレクトリが既に存在しますが、このプラグインの管理下ではありません。</p>
      <pre>{{ managedPath }}</pre>
      <p>続行するとこのディレクトリの内容は完全に置き換えられます。</p>
      <p>ルートディレクトリ直下の他のファイルには影響しません。</p>
      <div class="actions">
        <button @click="emit('change-root')">別のルートディレクトリを選択</button>
        <button class="primary" @click="emit('ok')">続行</button>
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
  max-width: 560px;
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
  pre {
    font-size: 11px;
    background: var(--color-bg-active);
    padding: 6px;
    border-radius: 4px;
    word-break: break-all;
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
      &.primary {
        background: var(--color-primary);
        color: var(--color-white);
      }
    }
  }
}
</style>
