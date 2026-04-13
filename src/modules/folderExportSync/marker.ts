import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const MARKER_FILE = '.managed-by-eagle.json';

/**
 * 管理ディレクトリに目印ファイルを書き込む。
 * 既存ファイルがあれば上書きする。
 */
export async function writeMarker(
  managedDir: string,
  meta: { version: string; createdAt: string; pluginId: string }
): Promise<void> {
  const payload = JSON.stringify(meta, null, 2);
  await fs.writeFile(path.join(managedDir, MARKER_FILE), payload, 'utf8');
}

/**
 * 指定ディレクトリが当プラグインの管理対象かどうかを返す。
 * 目印ファイルが存在し、かつ pluginId が文字列であれば true。
 * ファイルが存在しない、または JSON が壊れている場合は false を返す。
 */
export async function isManaged(managedDir: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(path.join(managedDir, MARKER_FILE), 'utf8');
    const obj = JSON.parse(raw) as { pluginId?: unknown };
    return typeof obj?.pluginId === 'string';
  } catch {
    return false;
  }
}

/**
 * 対象パスが reparse point (シンボリックリンク / ジャンクション) でないことを保証する。
 * reparse point であれば EREPARSE コードのエラーを throw する。
 */
export async function assertNotReparsePoint(targetPath: string): Promise<void> {
  const lst = await fs.lstat(targetPath);
  if (lst.isSymbolicLink()) {
    const err: NodeJS.ErrnoException = new Error(`path is a symbolic link: ${targetPath}`);
    err.code = 'EREPARSE';
    throw err;
  }
  const real = await fs.realpath(targetPath);
  if (path.resolve(real) !== path.resolve(targetPath)) {
    const err: NodeJS.ErrnoException = new Error(
      `path is a junction / reparse point: ${targetPath}`
    );
    err.code = 'EREPARSE';
    throw err;
  }
}
