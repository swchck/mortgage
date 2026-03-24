<script setup lang="ts">
import { watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps<{
  open: boolean;
  title: string;
  bodyHtml: string;
  wide?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));

watch(
  () => props.open,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : '';
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      class="modal-overlay"
      :class="{ open }"
      @click.self="emit('close')"
    >
      <div class="modal-box" :class="{ 'modal-wide': wide }">
        <div class="modal-title">{{ title }}</div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="modal-body" v-html="bodyHtml" />
        <button class="modal-close" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </Teleport>
</template>
