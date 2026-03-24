<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Info } from 'lucide-vue-next';
import AppModal from './AppModal.vue';

const props = defineProps<{ modalKey: string }>();

const { t, te } = useI18n();
const showModal = ref(false);

const titleKey = `modals.${props.modalKey}.title`;
const bodyKey = `modals.${props.modalKey}.body`;
const hasModal = te(titleKey);
</script>

<template>
  <span v-if="hasModal" class="tip-icon" @click.stop="showModal = true">
    <Info :size="10" :stroke-width="2.5" />
  </span>
  <AppModal
    v-if="hasModal"
    :open="showModal"
    :title="t(titleKey)"
    :body-html="t(bodyKey)"
    @close="showModal = false"
  />
</template>
