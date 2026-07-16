<script setup>
const props = defineProps({
  collapsed: Boolean,
})
</script>

<template>
  <img src="https://metal-docs-sh3b0.kinsta.page/metal-logo-icon.png" alt="Metal Logo" class="w-6 h-6" />
  <div v-if="!props.collapsed" class="flex items-center gap-2">
    <span class="ml-2 font-bold ">Metal</span>
  </div>
</template>
