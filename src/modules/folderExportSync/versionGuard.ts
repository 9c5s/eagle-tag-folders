export const MIN_EAGLE_BUILD = 22;

const DEFAULT_API_SAMPLE: { smartFolder?: unknown } = {};

/**
 * Eagle の build 番号と smartFolder API の有無の両方で
 * 本プラグインが動作可能かを判定する。
 * apiSample が省略された場合は globalThis.eagle.smartFolder を読み、
 * 存在すれば API check を満たす。Eagle 環境外 (テスト等) の単体評価では
 * smartFolder の有無は判定材料にしない。
 */
export function isSupportedEagleBuild(
  build: number,
  apiSample: { smartFolder?: unknown } = DEFAULT_API_SAMPLE
): boolean {
  if (build < MIN_EAGLE_BUILD) return false;
  if (apiSample === DEFAULT_API_SAMPLE) {
    const globalSmartFolder = (globalThis as { eagle?: { smartFolder?: unknown } }).eagle
      ?.smartFolder;
    if (typeof globalSmartFolder !== 'undefined') return true;
    // Eagle 環境外: build 数値だけで判定する
    return true;
  }
  if (typeof apiSample.smartFolder === 'undefined') return false;
  return true;
}
