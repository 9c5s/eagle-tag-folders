<script setup lang="ts">
import { inject } from 'vue';
import type { Settings } from '@/modules/folderExportSync';
import ExcludedTreeSetting from './ExcludedTreeSetting.vue';

type TreeNode = { id: string; name: string; children: TreeNode[] };
type RawNode = { id: string; name: string; children: RawNode[] };

const settings = inject<Settings>('settings')!;

async function fetchTree(): Promise<TreeNode[]> {
  const nodes = (await eagle.folder.getAll()) as unknown as RawNode[];
  const map = (n: RawNode): TreeNode => ({
    id: n.id,
    name: n.name,
    children: n.children.map(map)
  });
  return nodes.map(map);
}
</script>

<template>
  <ExcludedTreeSetting
    title="除外フォルダ"
    :fetch-tree="fetchTree"
    :excluded-ids="settings.excludedFolderIds"
    @update:excluded-ids="(v) => (settings.excludedFolderIds = v)"
  />
</template>
