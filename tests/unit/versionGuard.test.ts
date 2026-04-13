import { describe, it, expect } from 'vitest';
import { isSupportedEagleBuild } from '@/modules/folderExportSync/versionGuard';

describe('isSupportedEagleBuild', () => {
  it('build >= 22 なら true', () => {
    expect(isSupportedEagleBuild(22)).toBe(true);
    expect(isSupportedEagleBuild(99)).toBe(true);
  });
  it('build < 22 なら false', () => {
    expect(isSupportedEagleBuild(21)).toBe(false);
    expect(isSupportedEagleBuild(0)).toBe(false);
  });
  it('eagle.smartFolder が undefined なら false', () => {
    expect(isSupportedEagleBuild(99, { smartFolder: undefined })).toBe(false);
  });
});
