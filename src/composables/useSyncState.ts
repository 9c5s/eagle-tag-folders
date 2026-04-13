import { ref } from 'vue';
import type { PlanSummary, SymlinkPlan, SyncResult } from '@/modules/tagFolderSync';

type SyncState = 'Idle' | 'Planning' | 'Preview' | 'Syncing' | 'Completed' | 'Error' | 'RolledBack';

type DialogKind = 'consent' | 'devmode' | 'exitConfirm' | null;

const state = ref<SyncState>('Idle');
const summary = ref<PlanSummary | null>(null);
const plans = ref<SymlinkPlan[]>([]);
const result = ref<SyncResult | null>(null);
const progress = ref<{ current: number; total: number; currentTag: string }>({
  current: 0,
  total: 0,
  currentTag: ''
});
const errorMessage = ref<string | null>(null);
const activeDialog = ref<DialogKind>(null);

export function useSyncState() {
  return {
    state,
    summary,
    plans,
    result,
    progress,
    errorMessage,
    activeDialog,
    setState: (s: SyncState) => {
      state.value = s;
    },
    openDialog: (k: DialogKind) => {
      activeDialog.value = k;
    },
    closeDialog: () => {
      activeDialog.value = null;
    },
    reset: () => {
      state.value = 'Idle';
      summary.value = null;
      plans.value = [];
      result.value = null;
      errorMessage.value = null;
      activeDialog.value = null;
    }
  };
}
