<script setup lang="ts">
const { data: planMetrics, refresh: refreshPlans } = useFetch<Record<string, any>>('/server-api/metrics/plan:/plan:~')

onMounted(() => {
  const interval = setInterval(refreshPlans, 5000)
  onUnmounted(() => clearInterval(interval))
})

const selectedPlan = ref<string | null>(null)

const allPlans = computed(() => {
  if (!planMetrics.value) return []
  return Object.entries(planMetrics.value)
    .filter(([key]) => key.startsWith('plan:'))
    .map(([, plan]: [string, any]) => ({
      name: plan.planName ?? '—',
      status: plan.status ?? 'unknown',
      startTime: plan.startTime ?? null,
      endTime: plan.endTime ?? null,
      durationMs: plan.durationMs ?? 0,
      stepsCount: plan.steps?.length ?? 0,
      totalRows: plan.totalRows ?? 0
    }))
})

const selectedPlanData = computed(() => {
  if (!selectedPlan.value || !planMetrics.value) return null
  const key = `plan:${selectedPlan.value}`
  return planMetrics.value[key] ?? null
})

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function formatTime(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString()
}

function formatDateTime(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

const planColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'stepsCount', header: 'Steps' },
  { accessorKey: 'totalRows', header: 'Rows' },
  { accessorKey: 'startTime', header: 'Start Time' },
  { accessorKey: 'durationMs', header: 'Duration' }
]

function statusColor(status: string) {
  if (status === 'completed' || status === 'success') return 'success' as const
  if (status === 'running') return 'info' as const
  if (status === 'failed') return 'error' as const
  return 'neutral' as const
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-workflow ml-0 mr-2" />Plans</h1>
      <p class="text-sm text-muted">Monitor and manage ETL pipeline executions</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">All Plans</h2>
          </div>
        </template>
        <UTable
          :columns="planColumns"
          :data="allPlans"
        >
          <template #status-cell="{ row }">
            <UBadge :color="statusColor(row.original.status)" variant="subtle" size="sm">
              {{ row.original.status }}
            </UBadge>
          </template>
          <template #durationMs-cell="{ row }">
            {{ formatDuration(row.original.durationMs) }}
          </template>
        <template #startTime-cell="{ row }">
          <span class="text-sm">{{ formatDateTime(row.original.startTime) }}</span>
        </template>
        <template #name-cell="{ row }">
            <UButton
              variant="link"
              color="primary"
              @click="selectedPlan = selectedPlan === row.original.name ? null : row.original.name"
            >
              {{ row.original.name }}
            </UButton>
          </template>
        </UTable>
      </UCard>

      <UCard v-if="selectedPlanData">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="font-semibold">{{ selectedPlanData.planName }}</h2>
          </div>
          <UBadge :color="statusColor(selectedPlanData.status)" variant="subtle">
            {{ selectedPlanData.status }}
          </UBadge>
        </div>
      </template>

        <div class="flex flex-col gap-4">
          <div v-for="step in selectedPlanData.steps" :key="step.index" class="flex items-start gap-4 p-3 rounded-lg bg-elevated/50">
            <div class="flex flex-col items-center gap-1">
              <div
                class="size-3 rounded-full"
                :class="step.step.status === 'success' ? 'bg-success' : step.step.status === 'running' ? 'bg-info animate-pulse' : 'bg-muted'"
              />
              <div v-if="step.index < selectedPlanData.steps.length - 1" class="w-px h-full min-h-8 bg-default" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">Step {{ step.index + 1 }}</span>
                <span class="text-xs text-muted">
                  <template v-if="step.step.durationMs">
                    {{ formatDuration(step.step.durationMs) }}
                  </template>
                  <template v-else>in progress...</template>
                </span>
              </div>
              <div class="flex items-center gap-4 mt-1 text-xs text-muted">
                <span>Start: {{ formatTime(step.step.startTime) }}</span>
                <span v-if="step.step.endTime">End: {{ formatTime(step.step.endTime) }}</span>
                <span v-if="step.step.status">Status:
                  <UBadge :color="statusColor(step.step.status)" variant="subtle" size="xs">
                    {{ step.step.status }}
                  </UBadge>
                </span>
              </div>
              <div class="flex items-center gap-4 mt-1 text-xs text-muted">
                <span>Attempt #{{ step.attemptCount }}</span>
                <span v-if="step.rows?.input !== undefined">Rows in: {{ step.rows.input }}</span>
                <span v-if="step.rows?.passed !== undefined">Rows out: {{ step.rows.passed }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
