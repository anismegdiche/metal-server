<script setup lang="ts">
const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

function collectBody() {
  return { provider: 'plans' }
}

defineExpose({ collectBody })
</script>

<template>
  <div class="text-xs text-muted italic py-2">
    No configuration required for this provider.
  </div>
</template>
