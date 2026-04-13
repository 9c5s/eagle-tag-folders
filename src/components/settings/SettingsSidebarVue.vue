<script setup lang="ts">
import RootDirSetting from './RootDirSetting.vue';
import ExcludeTagsSetting from './ExcludeTagsSetting.vue';
import NamingModeSetting from './NamingModeSetting.vue';
import ConcurrencySetting from './ConcurrencySetting.vue';
import CleanupOldDirsButton from './CleanupOldDirsButton.vue';
import { useSyncState } from '@/composables/useSyncState';
import { useSync } from '@/composables/useSync';

const { state } = useSyncState();
const { triggerPreview, triggerSync } = useSync();
</script>

<template>
  <div class="settings-sidebar">
    <div class="settings-content">
      <RootDirSetting />
      <div class="divider" />
      <ExcludeTagsSetting />
      <div class="divider" />
      <NamingModeSetting />
      <div class="divider" />
      <ConcurrencySetting />
      <div class="divider" />
      <CleanupOldDirsButton />
    </div>
    <div class="actions">
      <button class="btn-preview" :disabled="state === 'Syncing'" @click="triggerPreview">
        プレビュー
      </button>
      <button class="btn-sync" :disabled="state !== 'Preview'" @click="triggerSync">
        同期実行
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border-primary);
  background: rgba(247, 248, 248, 0.5);
}
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.divider {
  height: 1px;
  background: var(--color-border-primary);
}
.actions {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--color-border-primary);
}
.btn-preview,
.btn-sync {
  width: 100%;
  height: 36px;
  border-radius: 6px;
  border: 1px solid var(--color-border-primary);
  background: var(--color-primary);
  color: var(--color-white);
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
