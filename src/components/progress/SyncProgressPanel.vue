<script setup lang="ts">
import { computed } from 'vue';
import { useSyncState } from '@/composables/useSyncState';
const { progress } = useSyncState();
const percent = computed(() =>
  progress.value.total === 0 ? 0 : Math.floor((progress.value.current / progress.value.total) * 100)
);
</script>

<template>
  <div class="sync-progress">
    <el-progress :percentage="percent" :show-text="false" color="var(--color-primary)" />
    <div class="text">{{ progress.current }} / {{ progress.total }} ({{ percent }}%)</div>
    <div class="current">処理中: {{ progress.currentTag }}</div>
  </div>
</template>

<style lang="scss" scoped>
.sync-progress {
  padding: 16px;
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  background: var(--color-bg-primary);
  .text,
  .current {
    font-size: 12px;
    margin-top: 6px;
    color: var(--color-text-primary);
  }
  .current {
    color: var(--color-text-secondary);
  }
}
</style>
