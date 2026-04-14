<script setup lang="ts">
import { inject } from 'vue';
import type { Settings } from '@/modules/folderExportSync';
import SettingsSection from './SettingsSection.vue';

const settings = inject<Settings>('settings')!;
</script>

<template>
  <SettingsSection title="symlink 命名">
    <el-radio-group v-model="settings.namingMode" class="naming-radios">
      <el-radio value="suffix">衝突時サフィックス (推奨)</el-radio>
      <el-radio value="id">常に ID 付加</el-radio>
    </el-radio-group>
  </SettingsSection>
</template>

<style lang="scss" scoped>
.naming-radios {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  // ラベルは _el-radio.scss の override でも base 指定済みだが、トレース容易性の
  // ためコンポーネント側でも明示する
  :deep(.el-radio__label) {
    font-size: var(--font-size-base);
  }
}
</style>
