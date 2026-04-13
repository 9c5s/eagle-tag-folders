<script setup lang="ts"></script>

<template>
  <div class="layout-root">
    <div class="layout-container">
      <aside class="layout-sidebar">
        <slot name="sidebar"></slot>
      </aside>
      <main class="layout-main">
        <slot name="main"></slot>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@styles/modules/mixins' as mixins;

.layout-root {
  --sidebar-min-width: 300px;
  --sidebar-max-width: 320px;
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
  min-width: var(--sidebar-min-width);
  max-width: var(--sidebar-max-width);
  flex-shrink: 0;
  padding: 8px;
}
.layout-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.06);

  @include mixins.dark {
    background: rgba(255, 255, 255, 0.03);
  }
}
</style>
