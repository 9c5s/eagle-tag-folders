import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { appendPerfLog, formatPerfRecord, type PerfRecord } from '@/modules/tagFolderSync/perfLog';

let tmpDir: string;

function makeRecord(overrides: Partial<PerfRecord> = {}): PerfRecord {
  return {
    startedAt: '2026-04-13T09:00:00.000Z',
    endedAt: '2026-04-13T09:00:19.000Z',
    totalMs: 19000,
    settings: {
      rootDir: 'D:/tmp/eagle',
      concurrency: { symlink: 8, mkdir: 4 },
      namingMode: 'suffix',
      sanitizeReplacement: '_',
      excludeTags: ['foo', 'bar']
    },
    buildPlan: { collectMs: 1200, planMs: 80, totalMs: 1280 },
    planSummary: {
      itemCount: 13500,
      excludedItemCount: 161,
      groupCount: 3,
      tagCount: 8,
      symlinkCount: 13339,
      collisionCount: 0
    },
    execute: {
      validateMs: 20,
      writeMs: 17500,
      swapMs: 120,
      totalMs: 17720,
      createdCount: 13339,
      skippedCount: 0,
      errorCount: 0,
      rolledBack: false
    },
    ...overrides
  };
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tagfolders-perflog-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('perfLog', () => {
  it('formatPerfRecord は startedAt を含む区切りと設定値・所要時間を含む', () => {
    const text = formatPerfRecord(makeRecord());
    expect(text).toContain('===== Run 2026-04-13T09:00:00.000Z =====');
    expect(text).toContain('concurrency.symlink:');
    expect(text).toContain('8');
    expect(text).toContain('concurrency.mkdir:');
    expect(text).toContain('4');
    expect(text).toContain('namingMode:');
    expect(text).toContain('suffix');
    expect(text).toContain('symlinkCount:');
    expect(text).toContain('13339');
    expect(text).toContain('writeMs:');
    expect(text).toContain('17500');
  });

  it('appendPerfLog は logDir 直下に perf.log を作る', async () => {
    const filePath = await appendPerfLog(tmpDir, makeRecord());
    expect(path.basename(filePath)).toBe('perf.log');
    expect(path.dirname(filePath)).toBe(tmpDir);
    const body = await fs.readFile(filePath, 'utf8');
    expect(body).toContain('===== Run 2026-04-13T09:00:00.000Z =====');
  });

  it('appendPerfLog は既存ファイルに実行単位で積み上げる', async () => {
    const p1 = await appendPerfLog(tmpDir, makeRecord({ startedAt: '2026-04-13T09:00:00.000Z' }));
    const p2 = await appendPerfLog(tmpDir, makeRecord({ startedAt: '2026-04-13T09:10:00.000Z' }));
    expect(p1).toBe(p2);
    const body = await fs.readFile(p2, 'utf8');
    const markers = body.match(/===== Run /g) ?? [];
    expect(markers.length).toBe(2);
    expect(body).toContain('===== Run 2026-04-13T09:00:00.000Z =====');
    expect(body).toContain('===== Run 2026-04-13T09:10:00.000Z =====');
  });

  it('appendPerfLog は存在しない階層でも再帰的に mkdir する', async () => {
    const nested = path.join(tmpDir, 'foo', 'bar', 'log');
    const filePath = await appendPerfLog(nested, makeRecord());
    expect((await fs.stat(filePath)).isFile()).toBe(true);
    expect(path.dirname(filePath)).toBe(nested);
  });
});
