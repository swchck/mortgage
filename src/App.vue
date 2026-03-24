<script setup lang="ts">
import { onMounted } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import AppHero from '@/components/AppHero.vue';
import LeftPanel from '@/components/LeftPanel/LeftPanel.vue';
import RightPanel from '@/components/RightPanel/RightPanel.vue';

const store = useCalcStore();

onMounted(() => {
  store.init();
  document.body.style.overflowX = 'hidden';
});
</script>

<template>
  <AppHero />
  <main class="main-grid">
    <LeftPanel />
    <RightPanel />
  </main>
</template>
