<script setup lang="ts">
import { PLAN_DOCUMENT_KEY, usePlanDocument } from '~/composables/usePlanDocument'
import PlanListPanel from './PlanListPanel.vue'
import StepPalette from './StepPalette.vue'
import PlanCanvas from './PlanCanvas.vue'
import StepConfigPanel from './StepConfigPanel.vue'

const doc = reactive(usePlanDocument())
provide(PLAN_DOCUMENT_KEY, doc)

onMounted(() => {
  doc.loadPlans()
  doc.loadSchemas()
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div
      v-if="doc.error"
      class="flex items-center gap-2 border-b border-error-500/30 bg-error-500/10 px-4 py-2"
    >
      <UIcon
        name="i-lucide-circle-alert"
        class="h-4 w-4 shrink-0 text-error-500"
      />
      <p class="min-w-0 flex-1 truncate text-sm text-error-600 dark:text-error-400">
        {{ doc.error }}
      </p>
      <UButton
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        color="neutral"
        aria-label="Dismiss"
        @click="doc.clearError()"
      />
    </div>

    <div class="flex min-h-0 flex-1">
      <div class="flex w-64 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800">
        <!-- Compact plan selector (auto height) -->
        <div class="shrink-0 border-b border-gray-200 p-2 dark:border-gray-800">
          <PlanListPanel />
        </div>

        <!-- Steps palette: fills all remaining height -->
        <div class="flex min-h-0 flex-1 flex-col">
          <div class="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Steps
            </p>
            <p class="text-[11px] text-gray-400 dark:text-gray-500">
              Drag to canvas
            </p>
          </div>
          <StepPalette />
        </div>
      </div>

      <div class="min-w-0 flex-1 bg-gray-50 dark:bg-gray-950">
        <PlanCanvas />
      </div>

      <div class="w-80 shrink-0 border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <StepConfigPanel />
      </div>
    </div>
  </div>
</template>
