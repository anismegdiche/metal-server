<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">
        <UIcon :name="icon" class="ml-0 mr-2" />{{ title }}
      </h1>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>
