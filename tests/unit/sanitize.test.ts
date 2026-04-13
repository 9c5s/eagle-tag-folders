import { describe, it, expect } from 'vitest';
import {
  sanitizeDirName,
  sanitizeFileName,
  computePathBudget,
  fitsWithinBudget
} from '@/modules/folderExportSync/sanitize';

describe('sanitizeDirName', () => {
  it('通常文字列はそのまま', () => {
    expect(sanitizeDirName('photos', '_')).toBe('photos');
  });
  it('日本語タグ名を維持', () => {
    expect(sanitizeDirName('写真', '_')).toBe('写真');
  });
  it('スラッシュを置換', () => {
    expect(sanitizeDirName('a/b', '_')).toBe('a_b');
  });
  it('複数の禁止文字を同時置換', () => {
    expect(sanitizeDirName('a:b*c?', '_')).toBe('a_b_c_');
  });
  it('NUL 文字を置換', () => {
    expect(sanitizeDirName('a\0b', '_')).toBe('a_b');
  });
  it('Windows 予約名 CON をエスケープ', () => {
    expect(sanitizeDirName('CON', '_')).toBe('_CON');
  });
  it('大文字小文字区別なく予約名エスケープ', () => {
    expect(sanitizeDirName('con', '_')).toBe('_con');
  });
  it('末尾スペースを除去', () => {
    expect(sanitizeDirName('abc ', '_')).toBe('abc');
  });
  it('末尾ピリオドを除去', () => {
    expect(sanitizeDirName('abc.', '_')).toBe('abc');
  });
  it('空文字化したら _ にフォールバック', () => {
    expect(sanitizeDirName('...', '_')).toBe('_');
  });
  it('255 バイト超 ASCII は切り詰め', () => {
    const long = 'a'.repeat(300);
    expect(Buffer.byteLength(sanitizeDirName(long, '_'), 'utf8')).toBeLessThanOrEqual(255);
  });
  it('UTF-8 多バイト文字の 255 byte 境界を維持', () => {
    const border = '字'.repeat(86);
    const result = sanitizeDirName(border, '_');
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(255);
  });
  it('切り詰め後も空文字にならない', () => {
    const result = sanitizeDirName('あ'.repeat(1000), '_');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('sanitizeFileName', () => {
  it('拡張子付き通常ファイル名', () => {
    expect(sanitizeFileName('photo.png', '_')).toBe('photo.png');
  });
  it('禁止文字付きファイル名', () => {
    expect(sanitizeFileName('a:b.png', '_')).toBe('a_b.png');
  });
  it('ファイル名部分が予約名なら拡張子込みでエスケープ', () => {
    expect(sanitizeFileName('CON.txt', '_')).toBe('_CON.txt');
  });
  it('ドットのみのファイル名は _', () => {
    expect(sanitizeFileName('.', '_')).toBe('_');
  });
  it('拡張子なしファイルは DirName と同じ扱い', () => {
    expect(sanitizeFileName('abc', '_')).toBe('abc');
  });
});

describe('computePathBudget', () => {
  it('Windows の上限は 260', () => {
    const b = computePathBudget('C:\\\\root\\\\eagle-tag-folders', 'win32');
    expect(b.maxTotal).toBe(260);
  });
  it('macOS の上限は 1024', () => {
    const b = computePathBudget('/root/eagle-tag-folders', 'darwin');
    expect(b.maxTotal).toBe(1024);
  });
  it('Linux の上限は 4096', () => {
    const b = computePathBudget('/root/eagle-tag-folders', 'linux');
    expect(b.maxTotal).toBe(4096);
  });
  it('alreadyUsed = managedDir パス長', () => {
    const p = 'C:\\\\root\\\\eagle-tag-folders';
    const b = computePathBudget(p, 'win32');
    expect(b.alreadyUsed).toBe(p.length);
    expect(b.remaining).toBe(260 - p.length);
  });
});

describe('fitsWithinBudget', () => {
  it('余裕があれば true', () => {
    const b = computePathBudget('/r/eagle-tag-folders', 'linux');
    expect(fitsWithinBudget(['g', 't', 'file.png'], 4, b)).toBe(true);
  });
  it('budget 超えると false', () => {
    const b = computePathBudget('C:\\\\root\\\\eagle-tag-folders', 'win32');
    const longName = 'x'.repeat(250);
    expect(fitsWithinBudget(['group', 'tag', longName + '.png'], 4, b)).toBe(false);
  });
});
