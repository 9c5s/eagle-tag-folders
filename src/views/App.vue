<script setup lang="ts">
import BodyVue from '@/components/layouts/BodyVue.vue';
import LayoutVue from '@/components/layouts/LayoutVue.vue';
import SettingsSidebarVue from '@/components/settings/SettingsSidebarVue.vue';
import MainPanel from '@/components/layouts/MainPanel.vue';
import { useEagleTheme } from '@/composables/useEagleTheme';
useEagleTheme();
</script>

<template>
  <BodyVue>
    <LayoutVue>
      <template #sidebar>
        <SettingsSidebarVue />
      </template>
      <template #main>
        <MainPanel />
      </template>
    </LayoutVue>
  </BodyVue>
</template>
