export {
  buildPlan,
  execute,
  resolvePaths,
  validatePrerequisites,
  needsConsent
} from './orchestrator';
export { cleanupLeftovers, cleanupOldDirs } from './cleanupLeftovers';
export { appendPerfLog, formatPerfRecord } from './perfLog';
export type { PerfRecord } from './perfLog';
export { MANAGED_SUBDIR, MARKER_FILE } from './constants';
export { isSupportedEagleBuild, MIN_EAGLE_BUILD } from './versionGuard';
export type {
  Settings,
  CategoryKey,
  ResolvedPaths,
  EagleItem,
  EagleTagGroup,
  SymlinkPlan,
  PlanSummary,
  SyncResult,
  SyncError,
  SyncErrorPhase,
  BuildPlanCallbacks,
  ExecutionCallbacks,
  BuildPlanPhase,
  ExecutionPhase
} from './types';
export { DEFAULT_SETTINGS } from './types';
