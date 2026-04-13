<script setup lang="ts">
import { useSyncState } from '@/composables/useSyncState';
const { summary } = useSyncState();
</script>

<template>
  <div v-if="summary" class="plan-summary">
    <div>対象アイテム: {{ summary.itemCount }} 件 (除外 {{ summary.excludedItemCount }} 件)</div>
    <div>タググループ数: {{ summary.groupCount }}</div>
    <div>タグ数: {{ summary.tagCount }}</div>
    <div>作成予定 symlink: {{ summary.symlinkCount }}</div>
    <div v-if="summary.collisionCount > 0">衝突: {{ summary.collisionCount }}</div>
    <div v-if="summary.sanitizedNames.length > 0">
      サニタイズ対象: {{ summary.sanitizedNames.length }} 件
    </div>
    <ul v-if="summary.warnings.length > 0" class="warnings">
      <li v-for="(w, i) in summary.warnings" :key="i">{{ w }}</li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.plan-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  padding: 16px;
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  background: var(--color-bg-primary);
}
.warnings {
  margin-top: 8px;
  padding-left: 18px;
  color: var(--color-warning);
  font-size: 11px;
}
</style>
