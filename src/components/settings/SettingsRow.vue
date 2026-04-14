<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div class="settings-row">
    <span class="settings-row__label">{{ label }}</span>
    <div class="settings-row__control">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  gap: 8px;
  padding: 0 0 0 4px;
}
.settings-row__label {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  min-width: 60px;
  flex: 0 0 auto;
  line-height: 20px;
}
.settings-row__control {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
