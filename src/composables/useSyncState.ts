import { ref } from 'vue';
import type { PlanSummary, SymlinkPlan, SyncResult } from '@/modules/folderExportSync';

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
// triggerPreview と runExecute の間で buildPlan の計測値を受け渡すための一時保管領域
const buildPlanTiming = ref<{
  collectMs: number;
  planMs: number;
  totalMs: number;
  startedAt: string;
} | null>(null);

export function useSyncState() {
  return {
    state,
    summary,
    plans,
    result,
    progress,
    errorMessage,
    activeDialog,
    buildPlanTiming,
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
      buildPlanTiming.value = null;
    }
  };
}
