<script setup lang="ts">
import { inject } from 'vue';
import type { Settings } from '@/modules/tagFolderSync';
import SettingsSection from './SettingsSection.vue';
import SettingsRow from './SettingsRow.vue';

const settings = inject<Settings>('settings')!;
</script>

<template>
  <SettingsSection title="並列度 (要実測で調整)">
    <SettingsRow label="symlink">
      <el-input-number
        v-model="settings.concurrency.symlink"
        :min="1"
        :max="64"
        controls-position="right"
      />
    </SettingsRow>
    <SettingsRow label="mkdir">
      <el-input-number
        v-model="settings.concurrency.mkdir"
        :min="1"
        :max="64"
        controls-position="right"
      />
    </SettingsRow>
  </SettingsSection>
</template>
