import { inject } from 'vue';
import type { BuildPlanPhase, ExecutionPhase, Settings } from '@/modules/tagFolderSync';
import {
  buildPlan,
  execute,
  validatePrerequisites,
  needsConsent,
  appendPerfLog
} from '@/modules/tagFolderSync';
import { useSyncState } from './useSyncState';

export function useSync() {
  // inject は setup コンテキストでのみ有効なため、useSync 呼び出し時に一度だけ解決する。
  // イベントハンドラ内で inject を呼ぶと activeInstance が null となり undefined が返る。
  const settings = inject<Settings>('settings')!;
  const state = useSyncState();

  async function triggerPreview() {
    state.setState('Planning');
    try {
      const startedAt = new Date();
      const marks: Partial<Record<BuildPlanPhase | 'start' | 'end', number>> = {
        start: performance.now()
      };
      const { summary: s, plans: p } = await buildPlan(settings, {
        onPhaseChange: (phase) => {
          marks[phase] = performance.now();
        }
      });
      marks.end = performance.now();
      const start = marks.start ?? 0;
      const collectStart = marks.collect ?? start;
      const planStart = marks.plan ?? marks.end ?? start;
      const end = marks.end ?? start;
      state.summary.value = s;
      state.plans.value = p;
      state.buildPlanTiming.value = {
        collectMs: Math.round(planStart - collectStart),
        planMs: Math.round((marks.done ?? end) - planStart),
        totalMs: Math.round(end - start),
        startedAt: startedAt.toISOString()
      };
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
    const marks: Partial<Record<ExecutionPhase | 'start' | 'end', number>> = {
      start: performance.now()
    };
    try {
      const r = await execute(state.plans.value, settings, {
        onProgress: (current, total, currentTag) => {
          state.progress.value = { current, total, currentTag };
        },
        onError: () => {},
        onPhaseChange: (phase) => {
          marks[phase] = performance.now();
        }
      });
      marks.end = performance.now();
      state.result.value = r;
      if (r.rolledBack) {
        state.setState('RolledBack');
        state.errorMessage.value = r.errors[0]?.message ?? '同期に失敗しました';
      } else {
        state.setState('Completed');
      }
      await recordPerfLog(settings, marks, r);
    } catch (err) {
      state.errorMessage.value = (err as Error).message;
      state.setState('Error');
    }
  }

  // 並列度と所要時間を perf.log に積み上げる (開発者ローカル用の計測機能)。
  // 書き込み先は Vite define 経由で注入される絶対パス (__PERF_LOG_DIR__)。
  // .env.local で VITE_PERF_LOG_DIR を設定した開発者のみ有効化され、
  // 未設定環境では空文字が埋め込まれるため何もしない。失敗時もメインフローに影響させない。
  async function recordPerfLog(
    settings: Settings,
    marks: Partial<Record<ExecutionPhase | 'start' | 'end', number>>,
    result: NonNullable<ReturnType<typeof useSyncState>['result']['value']>
  ): Promise<void> {
    if (__PERF_LOG_DIR__.length === 0) return;
    const bp = state.buildPlanTiming.value;
    const summary = state.summary.value;
    if (bp === null || summary === null) return;

    const start = marks.start ?? 0;
    const validateStart = marks.validate ?? start;
    const writeStart = marks.write ?? marks.end ?? start;
    const swapStart = marks.swap ?? marks.end ?? writeStart;
    const end = marks.end ?? start;

    try {
      await appendPerfLog(__PERF_LOG_DIR__, {
        startedAt: bp.startedAt,
        endedAt: new Date().toISOString(),
        totalMs: Math.round(end - start) + bp.totalMs,
        settings: {
          namingMode: settings.namingMode,
          excludeTags: [...settings.excludeTags],
          sanitizeReplacement: settings.sanitizeReplacement,
          rootDir: settings.rootDir
        },
        buildPlan: {
          collectMs: bp.collectMs,
          planMs: bp.planMs,
          totalMs: bp.totalMs
        },
        planSummary: {
          itemCount: summary.itemCount,
          excludedItemCount: summary.excludedItemCount,
          groupCount: summary.groupCount,
          tagCount: summary.tagCount,
          symlinkCount: summary.symlinkCount,
          collisionCount: summary.collisionCount
        },
        execute: {
          validateMs: Math.round(writeStart - validateStart),
          writeMs: Math.round(swapStart - writeStart),
          swapMs: Math.round((marks.done ?? end) - swapStart),
          totalMs: result.durationMs,
          createdCount: result.createdCount,
          skippedCount: result.skippedCount,
          errorCount: result.errors.length,
          rolledBack: result.rolledBack
        }
      });
    } catch (err) {
      console.warn('appendPerfLog failed:', err);
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
