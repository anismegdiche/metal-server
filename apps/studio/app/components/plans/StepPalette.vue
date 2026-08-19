<script setup lang="ts">
import { STEP_CATEGORIES, STEP_REGISTRY, type StepCategory, type StepColor, type StepMeta } from '~/utils/plans/stepRegistry'
import { usePlanDocumentInjected } from '~/composables/usePlanDocument'

const doc = usePlanDocumentInjected()

const search = ref('')
const scrollRef = ref<HTMLElement | null>(null)

const SCROLL_KEY = 'metal-designer-palette-scroll'

const grouped = computed(() => {
  const query = search.value.trim().toLowerCase()
  const filtered = STEP_REGISTRY.filter(
    step => step.label.toLowerCase().includes(query) || step.key.includes(query)
  )
  return STEP_CATEGORIES.map(category => ({
    category,
    steps: filtered.filter(step => step.category === category)
  })).filter(group => group.steps.length > 0)
})

function onDragStart(event: DragEvent, step: StepMeta) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/metal-step', step.key)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function onClick(step: StepMeta) {
  doc.addStep(step.key)
}

onMounted(() => {
  const saved = sessionStorage.getItem(SCROLL_KEY)
  if (scrollRef.value && saved) {
    scrollRef.value.scrollTop = Number(saved)
  }
})

function onScroll() {
  if (scrollRef.value) {
    sessionStorage.setItem(SCROLL_KEY, String(scrollRef.value.scrollTop))
  }
}

const iconFor: Record<StepCategory, string> = {
  'Data I/O': 'i-lucide-database',
  'Transform': 'i-lucide-wand-2',
  'AI': 'i-lucide-brain',
  'Flow': 'i-lucide-workflow',
  'Context': 'i-lucide-variable'
}

const colorClass: Record<StepColor, string> = {
  primary: 'text-primary-500',
  secondary: 'text-secondary-500',
  success: 'text-success-500',
  info: 'text-info-500',
  warning: 'text-warning-500',
  error: 'text-error-500',
  neutral: 'text-neutral-500'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="shrink-0 p-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search steps..."
        size="sm"
        :trailing="false"
      />
    </div>

    <div
      ref="scrollRef"
      class="min-h-0 flex-1 overflow-y-auto px-1 pb-2"
      @scroll="onScroll"
    >
      <div
        v-for="group in grouped"
        :key="group.category"
        class="mb-2"
      >
        <!-- Sticky category header -->
        <div class="sticky top-0 z-10 flex items-center gap-1.5 bg-gray-50 px-1.5 py-1 dark:bg-gray-950">
          <UIcon
            :name="iconFor[group.category]"
            class="h-3 w-3 shrink-0"
          />
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {{ group.category }}
          </p>
        </div>
        <!-- Dense step rows -->
        <div class="space-y-0.5">
          <button
            v-for="step in group.steps"
            :key="step.key"
            class="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            draggable="true"
            @dragstart="onDragStart($event, step)"
            @click="onClick(step)"
          >
            <UIcon
              :name="step.icon"
              class="h-6 w-6 shrink-0"
              :class="colorClass[step.color]"
            />
            <span class="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{{ step.label }}</span>
          </button>
        </div>
      </div>
      <p
        v-if="grouped.length === 0"
        class="px-1.5 text-xs text-gray-400"
      >
        No steps match "{{ search }}".
      </p>
    </div>
  </div>
</template>
