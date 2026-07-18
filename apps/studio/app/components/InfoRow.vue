<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
}>()
</script>

<template>
  <div class="flex justify-between text-sm">
    <span class="text-muted">{{ label }}</span>
    <span class="font-medium"><slot>{{ value }}</slot></span>
  </div>
  <USeparator />
</template>
