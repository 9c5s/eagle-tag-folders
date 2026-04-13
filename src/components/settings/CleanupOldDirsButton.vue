<script setup lang="ts">
import { inject, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import type { Settings } from '@/modules/tagFolderSync';
import { cleanupOldDirs } from '@/modules/tagFolderSync';

const settings = inject<Settings>('settings')!;
// 削除処理中フラグ
const removing = ref(false);
// 処理結果メッセージ
const message = ref('');

// 旧バージョンディレクトリを削除する
async function run(): Promise<void> {
  if (settings.rootDir === null) {
    message.value = 'ルートディレクトリが未設定です';
    return;
  }
  try {
    await ElMessageBox.confirm('旧バージョンディレクトリを削除しますか?', '確認', {
      confirmButtonText: '削除',
      cancelButtonText: 'キャンセル',
      type: 'warning'
    });
  } catch {
    // ユーザーがキャンセルした場合は何もしない
    return;
  }
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
    <el-button class="cleanup-btn" :loading="removing" @click="run">旧バージョンを削除</el-button>
    <span v-if="message" class="cleanup-message">{{ message }}</span>
  </div>
</template>

<style lang="scss" scoped>
.cleanup-old {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cleanup-btn {
  width: 100%;
}
.cleanup-message {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-align: center;
}
</style>
