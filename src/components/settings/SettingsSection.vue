<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <section class="settings-section">
    <div v-if="title" class="settings-section__title">{{ title }}</div>
    <div class="settings-section__body">
      <slot />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.settings-section__title {
  font-size: 12px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  padding-left: 4px;
}
.settings-section__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
