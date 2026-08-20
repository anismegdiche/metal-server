<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { TPlanNodeData } from '~/types/plans'
import { usePlanDocumentInjected } from '~/composables/usePlanDocument'
import { getStepMeta, type StepColor } from '~/utils/plans/stepRegistry'

const props = defineProps<NodeProps<TPlanNodeData>>()
const doc = usePlanDocumentInjected()

const isSelected = computed(() => props.selected)

const colorClasses: Record<StepColor, string> = {
  primary: 'border-primary-500 bg-primary-500',
  info: 'border-info-500 bg-info-500',
  warning: 'border-warning-500 bg-warning-500',
  success: 'border-success-500 bg-success-500',
  error: 'border-error-500 bg-error-500',
  secondary: 'border-secondary-500 bg-secondary-500',
  neutral: 'border-gray-500 bg-gray-500'
}
const stripeClass = computed(() => colorClasses[props.data?.color ?? 'neutral'])
const accentText: Record<StepColor, string> = {
  primary: 'text-primary-500',
  info: 'text-info-500',
  warning: 'text-warning-500',
  success: 'text-success-500',
  error: 'text-error-500',
  secondary: 'text-secondary-500',
  neutral: 'text-gray-500'
}
const accentClass = computed(() => accentText[props.data?.color ?? 'neutral'])

const meta = computed(() => getStepMeta(props.data?.stepKey ?? ''))
const schema = computed(() => {
  const p = props.data?.params
  if (!p || typeof p !== 'object') return undefined
  return typeof p['schema'] === 'string' ? (p['schema'] as string) : undefined
})
const entity = computed(() => {
  const p = props.data?.params
  if (!p || typeof p !== 'object') return undefined
  return typeof p['entity'] === 'string' ? (p['entity'] as string) : undefined
})
const subtitle = computed(() => {
  if (schema.value && entity.value) return `${schema.value}/${entity.value}`
  if (schema.value) return schema.value
  return undefined
})

function onDelete() {
  doc.removeStep(props.id)
}
function onUp() {
  doc.moveStep(props.id, -1)
}
function onDown() {
  doc.moveStep(props.id, 1)
}
</script>

<template>
  <div
    class="relative flex w-[260px] cursor-grab flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-gray-900"
    :class="[
      isSelected ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-gray-200 dark:border-gray-700'
    ]"
  >
    <div
      class="absolute inset-y-0 left-0 w-1"
      :class="stripeClass"
    />
    <Handle
      type="target"
      :position="Position.Top"
      class="!-top-[5px] !h-2.5 !w-2.5 !border-2 !border-white dark:!border-gray-900"
    />
    <Handle
      type="source"
      :position="Position.Bottom"
      class="!-bottom-[5px] !h-2.5 !w-2.5 !border-2 !border-white dark:!border-gray-900"
    />

    <div class="flex items-start gap-2 p-3 pl-4">
      <div
        class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        :class="`${accentClass} bg-current/10`"
      >
        <UIcon
          :name="meta.icon"
          class="h-4 w-4"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {{ props.data?.stepName ?? meta.label }}
        </p>
        <p
          v-if="subtitle"
          class="truncate font-mono text-[11px] text-gray-500 dark:text-gray-400"
        >
          {{ subtitle }}
        </p>
        <p
          v-else
          class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500"
        >
          {{ meta.category }}
        </p>
      </div>
    </div>

    <div class="mt-auto flex items-center justify-between border-t border-gray-100 px-2 py-1.5 dark:border-gray-800">
      <div class="flex items-center gap-1">
        <UTooltip
          text="Move up"
          :kbds="['Alt', 'ArrowUp']"
        >
          <UButton
            icon="i-lucide-chevron-up"
            size="xs"
            variant="ghost"
            color="neutral"
            aria-label="Move up"
            @click.stop="onUp"
          />
        </UTooltip>
        <UTooltip
          text="Move down"
          :kbds="['Alt', 'ArrowDown']"
        >
          <UButton
            icon="i-lucide-chevron-down"
            size="xs"
            variant="ghost"
            color="neutral"
            aria-label="Move down"
            @click.stop="onDown"
          />
        </UTooltip>
      </div>
      <UTooltip text="Remove step">
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          variant="ghost"
          color="error"
          aria-label="Remove step"
          @click.stop="onDelete"
        />
      </UTooltip>
    </div>
  </div>
</template>
