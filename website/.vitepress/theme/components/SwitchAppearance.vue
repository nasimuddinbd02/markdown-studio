<script lang="ts" setup>
// Replaces VitePress's VPSwitchAppearance (via an alias in config.ts) so the
// switch has an accessible name in the server-rendered HTML, not only after
// hydration. As a switch, its on/off state is announced from aria-checked.
import { inject, ref, watchPostEffect } from "vue";
import { useData } from "vitepress";
import VPSwitch from "vitepress/dist/client/theme-default/components/VPSwitch.vue";

const { isDark } = useData();
const toggleAppearance = inject("toggle-appearance", () => {
  isDark.value = !isDark.value;
});
const switchTitle = ref("Switch to dark theme");
watchPostEffect(() => {
  switchTitle.value = isDark.value ? "Switch to light theme" : "Switch to dark theme";
});
</script>

<template>
  <VPSwitch :title="switchTitle" aria-label="Dark theme" class="VPSwitchAppearance" :aria-checked="isDark" @click="toggleAppearance">
    <span class="vpi-sun sun" />
    <span class="vpi-moon moon" />
  </VPSwitch>
</template>

<style scoped>
.sun { opacity: 1; }
.moon { opacity: 0; }
.dark .sun { opacity: 0; }
.dark .moon { opacity: 1; }
.dark .VPSwitchAppearance :deep(.check) { transform: translateX(18px); }
</style>
