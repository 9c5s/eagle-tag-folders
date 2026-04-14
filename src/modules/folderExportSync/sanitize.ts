const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
const FORBIDDEN_CHARS = /[/\\:*?"<>|\0]/g;

function sanitizeCore(raw: string, replacement: string): string {
  let s = raw.replace(FORBIDDEN_CHARS, replacement);
  s = s.replace(/[ .]+$/, '');
  if (WINDOWS_RESERVED.test(s)) {
    s = '_' + s;
  }
  if (s.length === 0) s = '_';
  if (Buffer.byteLength(s, 'utf8') > 255) {
    while (Buffer.byteLength(s, 'utf8') > 255) {
      s = s.slice(0, -1);
    }
    if (s.length === 0) s = '_';
  }
  return s;
}

export function sanitizeDirName(raw: string, replacement: string): string {
  return sanitizeCore(raw, replacement);
}

export function sanitizeFileName(raw: string, replacement: string): string {
  if (raw === '.' || raw === '..') return '_';
  const dot = raw.lastIndexOf('.');
  if (dot <= 0 || dot === raw.length - 1) {
    return sanitizeCore(raw, replacement);
  }
  const base = raw.slice(0, dot);
  const ext = raw.slice(dot);
  const sanitizedBase = sanitizeCore(base, replacement);
  const sanitizedExt = ext.replace(FORBIDDEN_CHARS, replacement);
  return sanitizedBase + sanitizedExt;
}

type Platform = NodeJS.Platform;

export interface PathBudget {
  maxTotal: number;
  alreadyUsed: number;
  remaining: number;
  suffixReserve: number;
}

export function computePathBudget(managedDir: string, platform: Platform): PathBudget {
  const maxTotal = platform === 'win32' ? 260 : platform === 'darwin' ? 1024 : 4096;
  const alreadyUsed = managedDir.length;
  return {
    maxTotal,
    alreadyUsed,
    remaining: maxTotal - alreadyUsed,
    // 衝突サフィックス " (NNN)" 付与時の余裕分。実測 " (999)" = 6 char で足りる
    suffixReserve: 6
  };
}

// segments には拡張子込みのファイル名が最終要素として含まれる前提。
// 二重加算を避けるため extLength を別途受け取らない。
export function fitsWithinBudget(segments: string[], budget: PathBudget): boolean {
  const sep = 1;
  const total =
    budget.alreadyUsed +
    segments.reduce((acc, s) => acc + sep + s.length, 0) +
    budget.suffixReserve;
  return total <= budget.maxTotal;
}
