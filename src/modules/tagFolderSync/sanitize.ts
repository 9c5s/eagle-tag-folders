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
