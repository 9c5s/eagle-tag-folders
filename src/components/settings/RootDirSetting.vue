<script setup lang="ts">
import { inject, ref } from 'vue';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ElMessageBox } from 'element-plus';
import type { Settings } from '@/modules/tagFolderSync';
import SettingsSection from './SettingsSection.vue';

const settings = inject<Settings>('settings')!;
// エラーメッセージの表示用状態
const errorMessage = ref('');

// パスを検証してルートディレクトリに設定する
async function validateAndSet(candidate: string): Promise<void> {
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

// Eagle のネイティブダイアログでフォルダを選択する
async function openFolderPicker(): Promise<void> {
  errorMessage.value = '';
  try {
    const result = await eagle.dialog.showOpenDialog({
      title: 'ルートディレクトリを選択',
      defaultPath: settings.rootDir ?? undefined,
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled) return;
    const picked = result.filePaths[0];
    if (picked === undefined || picked.length === 0) return;
    await validateAndSet(picked);
  } catch (err) {
    errorMessage.value = `フォルダ選択に失敗しました: ${(err as Error).message}`;
  }
}

// テキスト入力でパスを手動入力する
async function manualInput(): Promise<void> {
  try {
    const result = await ElMessageBox.prompt(
      '絶対パスを入力してください',
      'ルートディレクトリのパス入力',
      {
        inputValue: settings.rootDir ?? '',
        confirmButtonText: 'OK',
        cancelButtonText: 'キャンセル',
        inputValidator: (val) => (val.length > 0 ? true : 'パスを入力してください')
      }
    );
    await validateAndSet(result.value);
  } catch {
    // ユーザーがキャンセルした場合は何もしない
  }
}
</script>

<template>
  <SettingsSection title="ルートディレクトリ">
    <el-tooltip
      :content="settings.rootDir ?? '(未設定)'"
      placement="top"
      :show-after="300"
      :disabled="settings.rootDir === null"
    >
      <div class="root-dir-value" :class="{ 'is-empty': settings.rootDir === null }">
        {{ settings.rootDir ?? '(未設定)' }}
      </div>
    </el-tooltip>
    <div class="root-dir-actions">
      <el-button size="small" @click="openFolderPicker">フォルダ選択...</el-button>
      <el-button size="small" @click="manualInput">パス入力...</el-button>
    </div>
    <div v-if="errorMessage" class="root-dir-error">{{ errorMessage }}</div>
    <p class="root-dir-hint">キーボードで直接入力する場合は「パス入力」を使用してください</p>
  </SettingsSection>
</template>

<style lang="scss" scoped>
.root-dir-value {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 4px 6px;
  background: var(--color-bg-active);
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.is-empty {
    color: var(--color-text-tertiary);
    font-style: italic;
  }
}
.root-dir-actions {
  display: flex;
  gap: 6px;
}
.root-dir-error {
  color: var(--color-negative);
  font-size: 11px;
}
.root-dir-hint {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin: 0;
  line-height: 1.35;
}
</style>
