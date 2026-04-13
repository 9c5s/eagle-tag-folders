<script setup lang="ts">
import { inject } from 'vue';
import type { Settings } from '@/modules/tagFolderSync';

const settings = inject<Settings>('settings')!;
</script>

<template>
  <div class="naming-mode">
    <label class="label">symlink 命名</label>
    <label class="option">
      <input v-model="settings.namingMode" type="radio" value="suffix" />
      衝突時サフィックス (推奨)
    </label>
    <label class="option">
      <input v-model="settings.namingMode" type="radio" value="id" />
      常に ID 付加
    </label>
  </div>
</template>

<style lang="scss" scoped>
.naming-mode {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .label {
    font-weight: bold;
    font-size: 12px;
  }

  .option {
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}
</style>
