<script setup lang="ts">
import { usePlanDocumentInjected } from '~/composables/usePlanDocument'

const doc = usePlanDocumentInjected()

const open = ref(false)
const creating = ref(false)
const newPlanName = ref('')

const dropdownRef = ref<HTMLElement | null>(null)

function select(name: string) {
  if (name !== doc.currentPlanName) doc.loadPlan(name)
  open.value = false
}

function startCreate() {
  creating.value = true
  newPlanName.value = ''
  nextTick(() => {
    document.querySelector<HTMLInputElement>('[data-new-plan-input]')?.focus()
  })
}

function create() {
  const name = newPlanName.value.trim()
  if (!name) return
  if (doc.plans.some(plan => plan.name === name)) {
    doc.error = `A plan named "${name}" already exists.`
    return
  }
  doc.createPlan(name)
  creating.value = false
}

function onDelete(name: string) {
  doc.deletePlan(name)
}

function onClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    open.value = false
    creating.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div
    ref="dropdownRef"
    class="relative"
  >
    <!-- Compact trigger row -->
    <button
      class="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-600"
      @click="open = !open"
    >
      <UIcon
        name="i-lucide-workflow"
        class="h-4 w-4 shrink-0 text-primary-500"
      />
      <span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
        {{ doc.currentPlanName || 'No plan selected' }}
      </span>
      <UBadge
        v-if="doc.currentPlanName"
        :label="String(doc.stepCount)"
        color="neutral"
        variant="soft"
        size="sm"
      />
      <span
        v-if="doc.dirty"
        class="h-2 w-2 shrink-0 rounded-full bg-warning-500"
        title="Unsaved changes"
      />
      <UTooltip
        v-if="doc.currentPlanName"
        text="Save plan"
      >
        <UButton
          icon="i-lucide-save"
          size="xs"
          variant="ghost"
          color="primary"
          aria-label="Save"
          :loading="doc.saving"
          :disabled="doc.saving"
          @click.stop="doc.save()"
        />
      </UTooltip>
      <UIcon
        name="i-lucide-chevron-down"
        class="h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-gray-500"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <!-- Flyout list -->
    <div
      v-show="open"
      class="absolute left-0 top-full z-50 mt-1 w-full min-w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <!-- Actions bar -->
      <div class="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5 dark:border-gray-800">
        <UTooltip text="Refresh plan list">
          <UButton
            icon="i-lucide-refresh-cw"
            size="xs"
            variant="ghost"
            color="neutral"
            aria-label="Refresh"
            @click="doc.loadPlans()"
          />
        </UTooltip>
        <UTooltip text="New plan">
          <UButton
            icon="i-lucide-plus"
            size="xs"
            variant="soft"
            color="primary"
            aria-label="New plan"
            @click="startCreate"
          />
        </UTooltip>
      </div>

      <!-- Inline creation form -->
      <div
        v-if="creating"
        class="flex items-center gap-1.5 border-b border-gray-100 px-2 py-1.5 dark:border-gray-800"
      >
        <UInput
          v-model="newPlanName"
          data-new-plan-input
          placeholder="Plan name..."
          size="sm"
          class="flex-1"
          @keyup.enter="create"
          @keyup.esc="creating = false"
        />
        <UButton
          icon="i-lucide-check"
          size="sm"
          color="primary"
          :disabled="!newPlanName.trim()"
          @click="create"
        />
      </div>

      <!-- Plan list (max 3 rows before scroll) -->
      <ul class="max-h-32 overflow-y-auto py-1">
        <li
          v-for="plan in doc.plans"
          :key="plan.name"
          class="group flex cursor-pointer items-center gap-2 px-2.5 py-1.5 transition-colors"
          :class="plan.name === doc.currentPlanName ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'"
          @click="select(plan.name)"
        >
          <UIcon
            name="i-lucide-workflow"
            class="h-3.5 w-3.5 shrink-0"
            :class="plan.name === doc.currentPlanName ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'"
          />
          <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ plan.name }}</span>
          <UBadge
            :label="String(plan.stepsCount)"
            color="neutral"
            variant="soft"
            size="sm"
          />
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            variant="ghost"
            color="error"
            aria-label="Delete plan"
            class="opacity-0 group-hover:opacity-100"
            @click.stop="onDelete(plan.name)"
          />
        </li>
      </ul>

      <p
        v-if="doc.plans.length === 0 && !doc.loading"
        class="px-2.5 py-2 text-center text-xs text-gray-400 dark:text-gray-500"
      >
        No plans yet. Click + to create one.
      </p>
    </div>
  </div>
</template>
