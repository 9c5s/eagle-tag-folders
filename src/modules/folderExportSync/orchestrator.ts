import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import type {
  Settings,
  PlanSummary,
  SymlinkPlan,
  ResolvedPaths,
  BuildPlanCallbacks,
  ExecutionCallbacks,
  SyncResult,
  SyncErrorPhase
} from './types';
import { MANAGED_SUBDIR } from './constants';
import { collectItems } from './collectItems';
import { buildSyncPlan } from './planBuilder';
import { assertNotReparsePoint, writeMarker, isManaged } from './marker';
import { probeSymlinkCapability } from './probeSymlinkCapability';
import { writeToStaging } from './writer';
import { atomicSwap } from './swap';

/**
 * rootDir を基点に各種作業ディレクトリのパスを計算して返す。
 */
export function resolvePaths(rootDir: string): ResolvedPaths {
  const ts = Date.now();
  return {
    rootDir,
    managedDir: path.join(rootDir, MANAGED_SUBDIR),
    stagingDir: path.join(rootDir, `${MANAGED_SUBDIR}.staging-${ts}`),
    oldDir: path.join(rootDir, `${MANAGED_SUBDIR}.old-${ts}`),
    probeDir: path.join(rootDir, `${MANAGED_SUBDIR}.probe-${ts}`)
  };
}

/**
 * 使用を禁止するシステムクリティカルパスの集合。
 */
const SYSTEM_CRITICAL_PATHS = new Set([
  '/',
  '/System',
  '/etc',
  '/usr',
  '/Library',
  'C:\\',
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)'
]);

/**
 * parent が child を含むか、あるいは child が parent と同一かを判定する。
 */
function isInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * 指定パスがホームディレクトリと一致するかを判定する。
 */
function isHomeDir(target: string): boolean {
  const home = path.resolve(os.homedir());
  return path.resolve(target) === home;
}

/**
 * Eagle ライブラリ内から symlink probe に使える既存ファイルを探す。
 * 見つからない場合はエラーを throw する。
 */
async function pickLibraryProbeFile(libraryPath: string): Promise<string> {
  const entries = await fs.readdir(libraryPath, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.isFile()) return path.join(libraryPath, e.name);
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = await fs
        .readdir(path.join(libraryPath, e.name), { withFileTypes: true })
        .catch(() => []);
      for (const se of sub) {
        if (se.isFile()) return path.join(libraryPath, e.name, se.name);
      }
    }
  }
  throw new Error(
    `symlink probe に使える既存ファイルがライブラリ内に見つかりません: ${libraryPath}`
  );
}

/**
 * 同期実行の前提条件を検証し、派生パスを返す。
 * 検証に失敗した場合はエラーを throw する。
 * @param settings ユーザー設定
 * @returns 派生パス情報
 */
export async function validatePrerequisites(settings: Settings): Promise<ResolvedPaths> {
  if (settings.rootDir === null) {
    throw new Error('rootDir が未設定です');
  }
  const resolvedRoot = path.resolve(settings.rootDir);

  const stat = await fs.stat(resolvedRoot).catch(() => null);
  if (stat === null || !stat.isDirectory()) {
    throw new Error(`rootDir が存在しないか、ディレクトリではありません: ${resolvedRoot}`);
  }

  await assertNotReparsePoint(resolvedRoot);

  const paths = resolvePaths(resolvedRoot);

  const libraryPath = path.resolve(eagle.library.path);
  if (
    resolvedRoot === libraryPath ||
    isInside(libraryPath, resolvedRoot) ||
    isInside(resolvedRoot, libraryPath)
  ) {
    throw new Error(`rootDir が Eagle ライブラリと重複しています: ${resolvedRoot}`);
  }

  if (SYSTEM_CRITICAL_PATHS.has(resolvedRoot) || isHomeDir(resolvedRoot)) {
    throw new Error(`システムクリティカルパスは使用できません: ${resolvedRoot}`);
  }

  const fsConstants = (await import('node:fs')).constants;
  await fs.access(resolvedRoot, fsConstants.W_OK);

  const managedStat = await fs.stat(paths.managedDir).catch(() => null);
  if (managedStat !== null && managedStat.isDirectory()) {
    await assertNotReparsePoint(paths.managedDir);
  }

  const probeSource = await pickLibraryProbeFile(libraryPath);
  await probeSymlinkCapability(paths, probeSource);

  return paths;
}

/**
 * managedDir が既存かつ本プラグイン管理外の場合に true を返す。
 * UI でユーザーの同意を得るべきかどうかの判定に使用する。
 */
export async function needsConsent(paths: ResolvedPaths): Promise<boolean> {
  const exists = await fs
    .stat(paths.managedDir)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (!exists) return false;
  return !(await isManaged(paths.managedDir));
}

/**
 * Eagle アイテムとタググループからシンボリックリンク計画を構築する。
 * @param settings ユーザー設定
 * @param callbacks フェーズ変化コールバック (省略可)
 * @returns 計画サマリと計画配列
 */
export async function buildPlan(
  settings: Settings,
  callbacks?: BuildPlanCallbacks
): Promise<{ summary: PlanSummary; plans: SymlinkPlan[] }> {
  callbacks?.onPhaseChange?.('collect');
  const { items, tagGroups, excludedCount } = await collectItems(settings.excludeTags);
  callbacks?.onPhaseChange?.('plan');
  const managedDir = settings.rootDir !== null ? path.join(settings.rootDir, MANAGED_SUBDIR) : '';
  const { plans, summary } = buildSyncPlan(
    items,
    tagGroups,
    settings,
    managedDir,
    process.platform
  );
  summary.excludedItemCount = excludedCount;
  callbacks?.onPhaseChange?.('done');
  return { summary, plans };
}

type ExecStage = 'validate' | 'write' | 'swap' | 'done';

/**
 * 実行ステージを SyncErrorPhase に変換する。
 */
function stageToPhase(stage: ExecStage): SyncErrorPhase {
  switch (stage) {
    case 'validate':
      return 'marker';
    case 'write':
      return 'write';
    case 'swap':
      return 'swap';
    case 'done':
      return 'write';
  }
}

/**
 * シンボリックリンク計画を実行する。
 * 前提条件の検証、staging への書き込み、アトミックスワップ、ロールバックを担う。
 * @param plans シンボリックリンク計画の配列
 * @param settings ユーザー設定
 * @param callbacks 進捗・フェーズ変化コールバック
 * @returns 同期結果
 */
export async function execute(
  plans: SymlinkPlan[],
  settings: Settings,
  callbacks: ExecutionCallbacks
): Promise<SyncResult> {
  const start = Date.now();
  let paths: ResolvedPaths | null = null;
  let stagingCreated = false;
  let oldDirCreated: string | null = null;
  let swapSucceeded = false;
  let currentStage: ExecStage = 'validate';

  try {
    currentStage = 'validate';
    callbacks.onPhaseChange?.('validate');
    paths = await validatePrerequisites(settings);

    if (await needsConsent(paths)) {
      throw new Error(
        `managedDir が既存かつプラグイン管理下ではありません。UI で同意を得てから execute を呼んでください: ${paths.managedDir}`
      );
    }

    currentStage = 'write';
    callbacks.onPhaseChange?.('write');
    await fs.mkdir(paths.stagingDir, { recursive: true });
    stagingCreated = true;
    await writeMarker(paths.stagingDir, {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      pluginId: eagle.plugin?.manifest?.id ?? 'eagle-folder-export'
    });
    const { errors } = await writeToStaging(plans, paths, settings, callbacks);

    currentStage = 'swap';
    callbacks.onPhaseChange?.('swap');
    const { oldDir } = await atomicSwap(paths);
    oldDirCreated = oldDir;
    swapSucceeded = true;

    currentStage = 'done';
    callbacks.onPhaseChange?.('done');
    return {
      success: true,
      createdCount: plans.length - errors.filter((e) => e.kind === 'skipped').length,
      skippedCount: errors.filter((e) => e.kind === 'skipped').length,
      durationMs: Date.now() - start,
      errors,
      rolledBack: false,
      oldDir: oldDirCreated
    };
  } catch (err) {
    const failurePhase = stageToPhase(currentStage);
    let rollbackPerformed = false;

    try {
      // staging が作成済みでスワップ前なら staging を削除する
      if (stagingCreated && paths !== null && !swapSucceeded) {
        await fs.rm(paths.stagingDir, { recursive: true, force: true });
        rollbackPerformed = true;
      }
      // oldDir が退避済みでスワップ前なら oldDir を managed に戻す
      if (oldDirCreated !== null && paths !== null && !swapSucceeded) {
        const managedExists = await fs
          .stat(paths.managedDir)
          .then(() => true)
          .catch(() => false);
        if (!managedExists) {
          await fs.rename(oldDirCreated, paths.managedDir);
          rollbackPerformed = true;
        }
      }
    } catch (rollbackErr) {
      console.warn('rollback failed:', rollbackErr);
    }

    return {
      success: false,
      createdCount: 0,
      skippedCount: 0,
      durationMs: Date.now() - start,
      errors: [
        {
          kind: 'fatal',
          phase: failurePhase,
          message: (err as Error).message,
          originalError: err as Error
        }
      ],
      rolledBack: rollbackPerformed,
      oldDir: swapSucceeded ? oldDirCreated : null
    };
  }
}
