import { describe, it, expect } from 'vitest';
import { classify } from '@/modules/tagFolderSync/errorClassifier';

function err(code: string): NodeJS.ErrnoException {
  const e: NodeJS.ErrnoException = new Error(code);
  e.code = code;
  return e;
}

describe('classify', () => {
  it.each([
    ['EPERM', 'fatal'],
    ['EACCES', 'fatal'],
    ['ENOSPC', 'fatal'],
    ['EROFS', 'fatal'],
    ['EMFILE', 'fatal'],
    ['ENFILE', 'fatal'],
    ['EXDEV', 'fatal'],
    ['EINVAL', 'fatal'],
    ['ENAMETOOLONG', 'fatal'],
    ['ENOENT', 'skipped'],
    ['EEXIST', 'skipped'],
    ['ELOOP', 'skipped']
  ])('%s → %s', (code, expected) => {
    expect(classify(err(code), 'write')).toBe(expected);
  });

  it('未知 errno は fatal にフォールバック', () => {
    expect(classify(err('EUNKNOWN'), 'write')).toBe('fatal');
  });

  it('code なし Error は fatal', () => {
    const e: NodeJS.ErrnoException = new Error('random');
    expect(classify(e, 'write')).toBe('fatal');
  });
});
