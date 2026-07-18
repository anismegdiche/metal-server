<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

function getStatusColor(status: string): 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  if (status === 'completed' || status === 'success' || status === 'connected' || status === 'active' || status === 'healthy') return 'success'
  if (status === 'running') return 'info'
  if (status === 'failed' || status === 'error' || status === 'disconnected' || status === 'down') return 'error'
  if (status === 'degraded' || status === 'paused') return 'warning'
  return 'neutral'
}

const color = computed(() => getStatusColor(props.status))
</script>

<template>
  <UBadge :color="color" variant="subtle" size="md">
    {{ status }}
  </UBadge>
</template>
