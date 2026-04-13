<script setup lang="ts">
import { ref } from 'vue';
import { useSyncState } from '@/composables/useSyncState';
const { result } = useSyncState();
const expanded = ref(false);
</script>

<template>
  <div v-if="result" class="sync-result">
    <div>✓ 成功: {{ result.createdCount }}</div>
    <div v-if="result.skippedCount > 0">スキップ: {{ result.skippedCount }}</div>
    <div>所要時間: {{ Math.round(result.durationMs / 1000) }} 秒</div>
    <button v-if="result.errors.length > 0" class="toggle" @click="expanded = !expanded">
      詳細 {{ expanded ? '▲' : '▼' }}
    </button>
    <ul v-if="expanded" class="errors">
      <li v-for="(e, i) in result.errors" :key="i">
        [{{ e.kind }}] {{ e.phase }}: {{ e.message }} ({{ e.itemId ?? '-' }})
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.sync-result {
  padding: 12px;
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  background: var(--color-bg-primary);
  font-size: 12px;
  .toggle {
    margin-top: 6px;
    background: none;
    border: 1px solid var(--color-border-primary);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
  }
  .errors {
    margin-top: 6px;
    padding-left: 18px;
    font-size: 11px;
  }
}
</style>
