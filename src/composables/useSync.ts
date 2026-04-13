import { inject } from 'vue';
import type { Settings } from '@/modules/tagFolderSync';
import { buildPlan, execute, validatePrerequisites, needsConsent } from '@/modules/tagFolderSync';
import { useSyncState } from './useSyncState';

export function useSync() {
  // inject は setup コンテキストでのみ有効なため、useSync 呼び出し時に一度だけ解決する。
  // イベントハンドラ内で inject を呼ぶと activeInstance が null となり undefined が返る。
  const settings = inject<Settings>('settings')!;
  const state = useSyncState();

  async function triggerPreview() {
    state.setState('Planning');
    try {
      const { summary: s, plans: p } = await buildPlan(settings);
      state.summary.value = s;
      state.plans.value = p;
      state.setState('Preview');
    } catch (err) {
      state.errorMessage.value = (err as Error).message;
      state.setState('Error');
    }
  }

  async function triggerSync() {
    state.setState('Syncing');

    // 1. 前提チェックと同意判定を先行
    try {
      const paths = await validatePrerequisites(settings);
      if (await needsConsent(paths)) {
        state.openDialog('consent');
        state.setState('Preview');
        return;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EPERM') {
        state.openDialog('devmode');
        state.setState('Error');
        state.errorMessage.value = (err as Error).message;
        return;
      }
      state.errorMessage.value = (err as Error).message;
      state.setState('Error');
      return;
    }

    // 2. 実際の execute
    await runExecute(settings);
  }

  async function runExecute(settings: Settings) {
    state.setState('Syncing');
    try {
      const r = await execute(state.plans.value, settings, {
        onProgress: (current, total, currentTag) => {
          state.progress.value = { current, total, currentTag };
        },
        onError: () => {},
        onPhaseChange: () => {}
      });
      state.result.value = r;
      if (r.rolledBack) {
        state.setState('RolledBack');
        state.errorMessage.value = r.errors[0]?.message ?? '同期に失敗しました';
      } else {
        state.setState('Completed');
      }
    } catch (err) {
      state.errorMessage.value = (err as Error).message;
      state.setState('Error');
    }
  }

  async function confirmConsentAndRun() {
    state.closeDialog();
    await runExecute(settings);
  }

  return {
    ...state,
    triggerPreview,
    triggerSync,
    confirmConsentAndRun
  };
}
