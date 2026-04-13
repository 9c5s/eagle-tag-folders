<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import SettingsSection from './SettingsSection.vue';

type TreeNode = { id: string; name: string; children: TreeNode[] };

const props = defineProps<{
  title: string;
  fetchTree: () => Promise<TreeNode[]>;
  excludedIds: string[];
}>();
const emit = defineEmits<{ (e: 'update:excludedIds', value: string[]): void }>();

const tree = ref<TreeNode[]>([]);
const checked = ref<string[]>([...props.excludedIds]);

async function reload(): Promise<void> {
  tree.value = await props.fetchTree();
}

const knownIds = computed(() => {
  const set = new Set<string>();
  const walk = (nodes: TreeNode[]): void => {
    for (const n of nodes) {
      set.add(n.id);
      walk(n.children);
    }
  };
  walk(tree.value);
  return set;
});

const orphanedIds = computed(() => checked.value.filter((id) => !knownIds.value.has(id)));

function purgeOrphaned(): void {
  checked.value = checked.value.filter((id) => knownIds.value.has(id));
}

onMounted(reload);

watch(
  () => [...props.excludedIds],
  (next) => {
    const sameLength = next.length === checked.value.length;
    const sameSet = sameLength && next.every((id) => checked.value.includes(id));
    if (!sameSet) checked.value = [...next];
  },
  { deep: false }
);

watch(checked, (v) => emit('update:excludedIds', [...v]), { deep: true });
</script>

<template>
  <SettingsSection :title="title">
    <div class="tree-actions">
      <el-button size="small" @click="reload">最新の状態を読み込む</el-button>
    </div>
    <el-tree
      :data="tree"
      node-key="id"
      show-checkbox
      :props="{ children: 'children', label: 'name' }"
      :default-checked-keys="checked"
      :default-expand-all="false"
      check-strictly="false"
      @check="
        (_: unknown, state: { checkedKeys: (string | number)[] }) =>
          (checked = state.checkedKeys.map(String))
      "
    />
    <div v-if="orphanedIds.length > 0" class="orphaned">
      <div class="orphaned__label">削除済みフォルダの除外指定: {{ orphanedIds.length }} 件</div>
      <ul class="orphaned__list">
        <li v-for="id in orphanedIds" :key="id">{{ id }}</li>
      </ul>
      <el-button size="small" @click="purgeOrphaned">削除済み ID を一括クリア</el-button>
    </div>
  </SettingsSection>
</template>

<style lang="scss" scoped>
.tree-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
}
.orphaned {
  margin-top: 8px;
  padding: 6px 8px;
  border: 1px dashed var(--color-border-secondary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--color-text-secondary);
  &__list {
    margin: 4px 0 6px;
    padding-left: 16px;
    max-height: 80px;
    overflow-y: auto;
  }
}
</style>
