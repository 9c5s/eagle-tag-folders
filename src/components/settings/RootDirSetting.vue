<script setup lang="ts">
import { inject, ref } from 'vue';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Settings } from '@/modules/tagFolderSync';

const settings = inject<Settings>('settings')!;
// エラーメッセージの表示用状態
const errorMessage = ref('');

// パスを検証してルートディレクトリに設定する
async function validateAndSet(candidate: string) {
  errorMessage.value = '';
  const resolved = path.resolve(candidate);
  try {
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      errorMessage.value = 'ディレクトリではありません';
      return;
    }
    settings.rootDir = resolved;
  } catch {
    errorMessage.value = '存在しないパスです';
  }
}

// ファイルピッカーからフォルダを選択する
async function onFolderPick(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files === null || files.length === 0) {
    errorMessage.value =
      '選択したディレクトリが空です。既存ファイルを含むディレクトリを選ぶか、下の「パス入力」から絶対パスを指定してください';
    return;
  }
  const firstFile = files[0] as File & { path?: string };
  if (firstFile.path !== undefined) {
    await validateAndSet(path.dirname(firstFile.path));
    return;
  }
  errorMessage.value =
    'ディレクトリのパスを取得できませんでした。「パス入力」で絶対パスを指定してください';
}

// テキスト入力でパスを手動入力する
async function manualInput() {
  const input = globalThis.prompt('ルートディレクトリの絶対パス:', settings.rootDir ?? '');
  if (input !== null && input.length > 0) {
    await validateAndSet(input);
  }
}
</script>

<template>
  <div class="root-dir-setting">
    <label class="label">ルートディレクトリ</label>
    <div class="value">{{ settings.rootDir ?? '(未設定)' }}</div>
    <div class="actions">
      <input
        id="root-dir-picker"
        type="file"
        webkitdirectory
        style="display: none"
        @change="onFolderPick"
      />
      <label for="root-dir-picker" class="btn">フォルダ選択...</label>
      <button @click="manualInput">パス入力...</button>
    </div>
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    <p class="hint">空ディレクトリを指定したい場合は「パス入力」で絶対パスを指定してください</p>
  </div>
</template>

<style lang="scss" scoped>
.root-dir-setting {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .label {
    font-weight: bold;
    font-size: 12px;
  }

  .value {
    font-size: 12px;
    color: var(--color-text-secondary);
    word-break: break-all;
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  .btn,
  button {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid var(--color-border-primary);
    background: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .error {
    color: var(--color-negative);
    font-size: 11px;
  }

  .hint {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }
}
</style>
