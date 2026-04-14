<script setup lang="ts">
const requiredBuild = 22;
const currentBuild =
  (globalThis as unknown as { eagle?: { app?: { build?: number } } }).eagle?.app?.build ?? 0;
</script>

<template>
  <div class="unsupported-screen" role="alert" data-testid="unsupported-screen">
    <h1>このプラグインを起動できません</h1>
    <p>Eagle 4.0 build{{ requiredBuild }} 以降が必要です。</p>
    <p>
      現在の build: <strong>{{ currentBuild }}</strong>
    </p>
    <p>
      Eagle を最新の 4.0 build22
      以降にアップデートしてから、このウィンドウを閉じて再度起動してください。
    </p>
  </div>
</template>

<style lang="scss" scoped>
.unsupported-screen {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  height: 100%;
  font-family: system-ui, sans-serif;
}
h1 {
  font-size: var(--font-size-xl);
  font-weight: 600;
}
p {
  font-size: var(--font-size-base);
  line-height: 1.6;
  margin: 0;
}
</style>
