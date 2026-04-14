<script setup lang="ts">
import PlanSummaryPanel from '@/components/preview/PlanSummaryPanel.vue';
import SyncProgressPanel from '@/components/progress/SyncProgressPanel.vue';
import SyncResultPanel from '@/components/result/SyncResultPanel.vue';
import FirstTimeConsentDialog from '@/components/dialogs/FirstTimeConsentDialog.vue';
import DevModeWarningDialog from '@/components/dialogs/DevModeWarningDialog.vue';
import ExitConfirmDialog from '@/components/dialogs/ExitConfirmDialog.vue';
import { useSync } from '@/composables/useSync';
import { inject, computed } from 'vue';
import type { Settings } from '@/modules/folderExportSync';

const sync = useSync();
const settings = inject<Settings>('settings')!;
const managedRootDir = computed(() => settings.rootDir ?? '');

function handleForceExit() {
  (globalThis as Window & typeof globalThis).close();
}
</script>

<template>
  <div class="main-panel">
    <div class="drag-helper"></div>

    <PlanSummaryPanel v-if="sync.state.value === 'Preview' || sync.state.value === 'Planning'" />
    <SyncProgressPanel v-if="sync.state.value === 'Syncing'" />
    <SyncResultPanel v-if="sync.state.value === 'Completed'" />

    <div
      v-if="sync.state.value === 'Error' || sync.state.value === 'RolledBack'"
      class="error-box"
      role="alert"
    >
      <h4>{{ sync.state.value === 'RolledBack' ? '同期が中断されました' : 'エラー' }}</h4>
      <p>{{ sync.errorMessage.value }}</p>
    </div>

    <FirstTimeConsentDialog
      :visible="sync.activeDialog.value === 'consent'"
      :root-dir="managedRootDir"
      @ok="sync.confirmConsentAndRun"
      @change-root="sync.closeDialog"
      @cancel="sync.closeDialog"
    />

    <DevModeWarningDialog
      :visible="sync.activeDialog.value === 'devmode'"
      @close="sync.closeDialog"
    />

    <ExitConfirmDialog
      :visible="sync.activeDialog.value === 'exitConfirm'"
      @stay="sync.closeDialog"
      @force-exit="handleForceExit"
    />
  </div>
</template>

<style lang="scss" scoped>
.main-panel {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}
.drag-helper {
  -webkit-app-region: drag;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 28px;
}
.error-box {
  padding: 16px;
  border: 1px solid var(--color-negative);
  border-radius: 8px;
  background: rgba(255, 59, 48, 0.1);
  color: var(--color-negative);
  h4 {
    margin: 0 0 6px;
    font-size: var(--font-size-base);
  }
  p {
    font-size: var(--font-size-sm);
    margin: 0;
  }
}
</style>
