<script setup lang="ts">
import { ref, inject } from 'vue';
import type { Settings } from '@/modules/tagFolderSync';

const settings = inject<Settings>('settings')!;
// 新規タグ入力用の状態
const newTag = ref('');

// 除外タグを追加する
function add() {
  const v = newTag.value.trim();
  if (v.length > 0 && !settings.excludeTags.includes(v)) {
    settings.excludeTags.push(v);
    newTag.value = '';
  }
}

// 除外タグを削除する
function remove(i: number) {
  settings.excludeTags.splice(i, 1);
}
</script>

<template>
  <div class="exclude-tags-setting">
    <label class="label">除外タグ</label>
    <div class="tags">
      <span v-for="(t, i) in settings.excludeTags" :key="i" class="tag">
        {{ t }}
        <button @click="remove(i)">×</button>
      </span>
    </div>
    <div class="input-row">
      <input v-model="newTag" placeholder="除外タグ名" @keydown.enter="add" />
      <button @click="add">追加</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.exclude-tags-setting {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .label {
    font-weight: bold;
    font-size: 12px;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--color-bg-active);
    font-size: 11px;

    button {
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
    }
  }

  .input-row {
    display: flex;
    gap: 4px;

    input {
      flex: 1;
      font-size: 12px;
      padding: 4px;
      border-radius: 4px;
      border: 1px solid var(--color-border-primary);
    }

    button {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--color-border-primary);
      cursor: pointer;
    }
  }
}
</style>
