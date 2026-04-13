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
    <div class="bar">
      <div class="fill" :style="{ width: percent + '%' }"></div>
    </div>
    <div class="text">{{ progress.current }} / {{ progress.total }} ({{ percent }}%)</div>
    <div class="current">処理中: {{ progress.currentTag }}</div>
  </div>
</template>

<style lang="scss" scoped>
.sync-progress {
  padding: 12px;
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  background: var(--color-bg-primary);
  .bar {
    width: 100%;
    height: 4px;
    background: var(--color-border-primary);
    border-radius: 2px;
    overflow: hidden;
    .fill {
      height: 100%;
      background: var(--color-primary);
      transition: width 120ms;
    }
  }
  .text,
  .current {
    font-size: 12px;
    margin-top: 4px;
  }
}
</style>
