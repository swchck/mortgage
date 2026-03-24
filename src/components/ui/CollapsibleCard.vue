<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  defaultOpen?: boolean;
}>(), {
  defaultOpen: true,
});

const open = ref(props.defaultOpen);
</script>

<template>
  <div class="card fade-in" style="padding: 18px; margin-bottom: 16px">
    <div class="collapse-header" @click="open = !open">
      <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0">
        <slot name="header" />
      </div>
      <ChevronDown :size="16" class="collapse-arr" :class="{ collapsed: !open }" />
    </div>
    <div v-show="open" style="padding-top: 14px">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  gap: 8px;
}
.collapse-arr {
  color: var(--muted);
  transition: transform .25s;
  flex-shrink: 0;
}
.collapse-arr.collapsed {
  transform: rotate(-90deg);
}
</style>
