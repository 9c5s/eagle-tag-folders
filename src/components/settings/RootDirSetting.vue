<script setup lang="ts">
import { inject, ref } from 'vue';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Settings } from '@/modules/folderExportSync';
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
    </div>
    <div v-if="errorMessage" class="root-dir-error">{{ errorMessage }}</div>
  </SettingsSection>
</template>

<style lang="scss" scoped>
.root-dir-value {
  font-size: var(--font-size-sm);
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
  font-size: var(--font-size-xs);
}
</style>
