<script setup lang="ts">
import { inject, ref } from 'vue';
import type { Settings } from '@/modules/tagFolderSync';
import { cleanupOldDirs } from '@/modules/tagFolderSync';

const settings = inject<Settings>('settings')!;
// 削除処理中フラグ
const removing = ref(false);
// 処理結果メッセージ
const message = ref('');

// 旧バージョンディレクトリを削除する
async function run() {
  if (settings.rootDir === null) {
    message.value = 'ルートディレクトリが未設定です';
    return;
  }
  if (!globalThis.confirm('旧バージョンディレクトリを削除しますか?')) return;
  removing.value = true;
  try {
    const { removed, errors } = await cleanupOldDirs(settings.rootDir);
    message.value = `${removed.length} 件削除、${errors.length} 件失敗`;
  } finally {
    removing.value = false;
  }
}
</script>

<template>
  <div class="cleanup-old">
    <button :disabled="removing" @click="run">旧バージョンを削除</button>
    <span v-if="message" class="message">{{ message }}</span>
  </div>
</template>

<style lang="scss" scoped>
.cleanup-old {
  display: flex;
  flex-direction: column;
  gap: 4px;

  button {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid var(--color-border-primary);
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .message {
    font-size: 11px;
    color: var(--color-text-secondary);
  }
}
</style>
