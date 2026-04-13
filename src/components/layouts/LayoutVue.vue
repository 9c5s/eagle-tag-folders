<script setup lang="ts">
import HeaderVue from './HeaderVue.vue';
</script>

<template>
  <div class="layout-root">
    <HeaderVue />
    <div class="layout-container">
      <aside class="layout-sidebar">
        <!-- Phase 6 で SettingsSidebarVue を配置 -->
        <slot name="sidebar"></slot>
      </aside>
      <main class="layout-main">
        <!-- Phase 6 で MainPanel を配置 -->
        <slot name="main"></slot>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-root {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.layout-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.layout-sidebar {
  min-width: 300px;
  max-width: 340px;
  flex-shrink: 0;
  padding: 8px;
}
.layout-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
