<script setup lang="ts">
import { inject } from 'vue';
import type { Settings, CategoryKey } from '@/modules/folderExportSync';
import SettingsSection from './SettingsSection.vue';

const settings = inject<Settings>('settings')!;

const items: Array<{ key: CategoryKey; label: string }> = [
  { key: 'folders', label: 'フォルダ' },
  { key: 'smartFolders', label: 'スマートフォルダ' },
  { key: 'all', label: 'すべて' },
  { key: 'untagged', label: 'タグなし' },
  { key: 'uncategorized', label: '未分類 (通常フォルダにもスマートフォルダにも未所属)' }
];
</script>

<template>
  <SettingsSection title="カテゴリ">
    <div class="toggle-list">
      <div v-for="it in items" :key="it.key" class="toggle-row">
        <el-switch v-model="settings.categories[it.key]" />
        <span>{{ it.label }}</span>
      </div>
    </div>
  </SettingsSection>
</template>

<style lang="scss" scoped>
.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
