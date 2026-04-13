<script setup lang="ts">
import { inject } from 'vue';
import type { Settings } from '@/modules/tagFolderSync';

const settings = inject<Settings>('settings')!;
</script>

<template>
  <div class="concurrency">
    <label class="label">並列度 (要実測で調整)</label>
    <div class="row">
      <span>symlink:</span>
      <input v-model.number="settings.concurrency.symlink" type="number" min="1" max="64" />
    </div>
    <div class="row">
      <span>mkdir:</span>
      <input v-model.number="settings.concurrency.mkdir" type="number" min="1" max="64" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.concurrency {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .label {
    font-weight: bold;
    font-size: 12px;
  }

  .row {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;

    input {
      width: 60px;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid var(--color-border-primary);
    }
  }
}
</style>
