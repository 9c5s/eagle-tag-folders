import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Settings } from './types';

// 並列度別の処理時間を計測して比較するための開発用ログ。
// 呼び出し側から渡された logDir 配下の perf.log に実行単位で追記し続ける。
// 書き込み先はプロジェクトローカルの .tmp/log を想定しており、
// 呼び出し側 (useSync) が Vite define 経由の絶対パスを与える。

export type PerfRecord = {
  startedAt: string;
  endedAt: string;
  totalMs: number;
  settings: Pick<
    Settings,
    'concurrency' | 'namingMode' | 'excludeTags' | 'sanitizeReplacement' | 'rootDir'
  >;
  buildPlan: {
    collectMs: number;
    planMs: number;
    totalMs: number;
  };
  planSummary: {
    itemCount: number;
    excludedItemCount: number;
    groupCount: number;
    tagCount: number;
    symlinkCount: number;
    collisionCount: number;
  };
  execute: {
    validateMs: number;
    writeMs: number;
    swapMs: number;
    totalMs: number;
    createdCount: number;
    skippedCount: number;
    errorCount: number;
    rolledBack: boolean;
  };
};

const PERF_FILE = 'perf.log';

function pad(label: string, width: number): string {
  return label.length >= width ? label : label + ' '.repeat(width - label.length);
}

export function formatPerfRecord(r: PerfRecord): string {
  const W = 20;
  const lines = [
    `===== Run ${r.startedAt} =====`,
    `${pad('endedAt:', W)}${r.endedAt}`,
    `${pad('totalMs:', W)}${r.totalMs}`,
    '',
    '[Settings]',
    `${pad('concurrency.symlink:', W)}${r.settings.concurrency.symlink}`,
    `${pad('concurrency.mkdir:', W)}${r.settings.concurrency.mkdir}`,
    `${pad('namingMode:', W)}${r.settings.namingMode}`,
    `${pad('sanitizeReplace:', W)}${JSON.stringify(r.settings.sanitizeReplacement)}`,
    `${pad('excludeTags:', W)}${JSON.stringify(r.settings.excludeTags)}`,
    `${pad('rootDir:', W)}${r.settings.rootDir ?? ''}`,
    '',
    '[BuildPlan]',
    `${pad('collectMs:', W)}${r.buildPlan.collectMs}`,
    `${pad('planMs:', W)}${r.buildPlan.planMs}`,
    `${pad('totalMs:', W)}${r.buildPlan.totalMs}`,
    '',
    '[PlanSummary]',
    `${pad('itemCount:', W)}${r.planSummary.itemCount}`,
    `${pad('excludedItemCount:', W)}${r.planSummary.excludedItemCount}`,
    `${pad('groupCount:', W)}${r.planSummary.groupCount}`,
    `${pad('tagCount:', W)}${r.planSummary.tagCount}`,
    `${pad('symlinkCount:', W)}${r.planSummary.symlinkCount}`,
    `${pad('collisionCount:', W)}${r.planSummary.collisionCount}`,
    '',
    '[Execute]',
    `${pad('validateMs:', W)}${r.execute.validateMs}`,
    `${pad('writeMs:', W)}${r.execute.writeMs}`,
    `${pad('swapMs:', W)}${r.execute.swapMs}`,
    `${pad('totalMs:', W)}${r.execute.totalMs}`,
    `${pad('createdCount:', W)}${r.execute.createdCount}`,
    `${pad('skippedCount:', W)}${r.execute.skippedCount}`,
    `${pad('errorCount:', W)}${r.execute.errorCount}`,
    `${pad('rolledBack:', W)}${r.execute.rolledBack}`,
    ''
  ];
  return lines.join('\n');
}

/**
 * logDir/perf.log に計測ログを 1 実行分追記する。
 * ディレクトリが無ければ再帰的に作成し、既存ファイルには空行 1 つを挟んで追記する。
 * @returns 追記対象ファイルのフルパス
 */
export async function appendPerfLog(logDir: string, record: PerfRecord): Promise<string> {
  await fs.mkdir(logDir, { recursive: true });
  const filePath = path.join(logDir, PERF_FILE);
  const exists = await fs
    .stat(filePath)
    .then(() => true)
    .catch(() => false);
  const body = (exists ? '\n' : '') + formatPerfRecord(record);
  await fs.appendFile(filePath, body, 'utf8');
  return filePath;
}
