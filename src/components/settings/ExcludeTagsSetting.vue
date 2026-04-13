<script setup lang="ts">
import { ref, inject } from 'vue';
import type { Settings } from '@/modules/tagFolderSync';
import SettingsSection from './SettingsSection.vue';

const settings = inject<Settings>('settings')!;
// 新規タグ入力用の状態
const newTag = ref('');

// 除外タグを追加する
function add(): void {
  const v = newTag.value.trim();
  if (v.length > 0 && !settings.excludeTags.includes(v)) {
    settings.excludeTags.push(v);
    newTag.value = '';
  }
}

// 除外タグを削除する
function remove(i: number): void {
  settings.excludeTags.splice(i, 1);
}
</script>

<template>
  <SettingsSection title="除外タグ">
    <div v-if="settings.excludeTags.length > 0" class="tag-list">
      <el-tag
        v-for="(t, i) in settings.excludeTags"
        :key="i"
        closable
        :disable-transitions="true"
        @close="remove(i)"
      >
        {{ t }}
      </el-tag>
    </div>
    <div class="input-row">
      <el-input v-model="newTag" placeholder="除外タグ名" size="small" @keydown.enter="add" />
      <el-button size="small" @click="add">追加</el-button>
    </div>
  </SettingsSection>
</template>

<style lang="scss" scoped>
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.input-row {
  display: flex;
  gap: 6px;

  :deep(.el-input) {
    flex: 1;
  }
}
</style>
