<script setup lang="ts">
import { computed, inject } from 'vue';
import RootDirSetting from './RootDirSetting.vue';
import CategoryTogglesSetting from './CategoryTogglesSetting.vue';
import ExcludedFolderTreeSetting from './ExcludedFolderTreeSetting.vue';
import ExcludedSmartFolderTreeSetting from './ExcludedSmartFolderTreeSetting.vue';
import type { Settings } from '@/modules/folderExportSync';
import { useSyncState } from '@/composables/useSyncState';
import { useSync } from '@/composables/useSync';

const settings = inject<Settings>('settings')!;
const { state } = useSyncState();
const { triggerPreview, triggerSync } = useSync();

// rootDir 未設定の状態ではプレビューも同期実行も意味を成さないため両ボタンを抑止する
const isRootDirUnset = computed(() => settings.rootDir === null);

// Eagle プラグインマニフェストからタイトルを取得する
const title =
  (globalThis as unknown as { eagle?: { plugin?: { manifest?: { name?: string } } } }).eagle?.plugin
    ?.manifest?.name ?? 'Folder Export';
</script>

<template>
  <div class="settings-sidebar">
    <header class="sidebar-header">
      <div class="sidebar-header__drag">
        <img class="sidebar-header__logo" src="/logo.png" alt="logo" />
        <span class="sidebar-header__title">{{ title }}</span>
      </div>
    </header>
    <div class="settings-content">
      <RootDirSetting />
      <div class="divider" />
      <CategoryTogglesSetting />
      <div class="divider" />
      <ExcludedFolderTreeSetting />
      <div class="divider" />
      <ExcludedSmartFolderTreeSetting />
    </div>
    <div class="actions">
      <el-button
        type="primary"
        class="btn-preview"
        :disabled="state === 'Syncing' || isRootDirUnset"
        @click="triggerPreview"
      >
        {{ $translate('action.preview', 'プレビュー') }}
      </el-button>
      <el-button
        type="primary"
        class="btn-sync"
        :disabled="state !== 'Preview' || isRootDirUnset"
        @click="triggerSync"
      >
        {{ $translate('action.export', 'エクスポート') }}
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@styles/modules/mixins' as mixins;

.settings-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border-primary);
  background: rgba(247, 248, 248, 0.5);
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.15);

  @include mixins.dark {
    background: rgba(247, 248, 248, 0.05);
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.25);
  }
}
.sidebar-header {
  position: relative;
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--color-border-secondary);
  flex-shrink: 0;
  user-select: none;

  &__drag {
    -webkit-app-region: drag;
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  &__logo {
    width: 24px;
    height: 24px;
    border-radius: 6px;
  }
  &__title {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-md);
  }
}
.settings-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.divider {
  height: 1px;
  background: var(--color-border-secondary);
  margin: 0 -12px;
}
.actions {
  flex-shrink: 0;
  padding: 12px;
  display: flex;
  flex-direction: row;
  gap: 10px;
  border-top: 1px solid var(--color-border-primary);
}
.btn-preview {
  flex: 7;
}
.btn-sync {
  flex: 3;
}
</style>
