<script setup lang="ts">
defineProps<{
  icon: string
  value: string | number
  label: string
  iconClass?: string
}>()
</script>

<template>
  <UCard class="bg-metal-gradient">
    <div class="flex items-center gap-3">
      <UIcon :name="icon" class="size-12" :class="iconClass" />
      <div>
        <p class="text-2xl font-bold">{{ value }}</p>
        <p class="text-xs text-muted">{{ label }}</p>
        <p v-if="$slots.sub" class="text-[10px] text-muted font-mono">
          <slot name="sub" />
        </p>
      </div>
    </div>
  </UCard>
</template>
