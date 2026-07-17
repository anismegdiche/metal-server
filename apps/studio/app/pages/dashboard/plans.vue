<script setup lang="ts">

const { data: planMetrics, refresh: refreshPlans } = useFetch<Record<string, any>>('/server-api/metrics/plan:/plan:%7E')
const { data: plansSummary, refresh: refreshPlansSummary } = useFetch<Record<string, any>>('/server-api/metrics/plans:/plans:%7E')

onMounted(() => {
  const interval = setInterval(() => {
    refreshPlans()
    refreshPlansSummary()
  }, 5000)
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

function stepIndicatorClass(status: string) {
  if (status === 'success') return 'text-inverted bg-success group-data-[state=completed]:bg-success group-data-[state=active]:bg-success'
  if (status === 'failed') return 'text-inverted bg-error group-data-[state=completed]:bg-error group-data-[state=active]:bg-error'
  if (status === 'running') return 'text-inverted bg-info group-data-[state=completed]:bg-info group-data-[state=active]:bg-info'
  return ''
}

const timelineItems = computed(() => {
  if (!selectedPlanData.value?.steps) return []
  return selectedPlanData.value.steps.map((step: any) => ({
    icon: step.step.status === 'success' ? 'i-lucide-check-circle'
      : step.step.status === 'failed' ? 'i-lucide-x-circle'
        : step.step.status === 'running' ? 'i-lucide-loader'
          : 'i-lucide-circle',
    date: formatTime(step.step.startTime),
    title: `Step ${step.index + 1} — ${formatDuration(step.step.durationMs ?? 0)}`,
    rows: step.rows,
    slot: 'step',
    ui: {
      indicator: stepIndicatorClass(step.step.status),
      separator: 'group-data-[state=completed]:bg-elevated'
    }
  }))
})

const activeStepIndex = computed(() => {
  if (!selectedPlanData.value?.steps) return undefined
  const steps = selectedPlanData.value.steps
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].step.status === 'running' || steps[i].step.status === 'success') return i
  }
  return undefined
})

const totalPlans = computed(() => plansSummary.value?.['plans:total'] ?? 0)
const activePlans = computed(() => plansSummary.value?.['plans:active'] ?? 0)
const totalExecutions = computed(() => plansSummary.value?.['plans:execution'] ?? 0)

const totalRowsProcessed = computed(() => {
  if (!planMetrics.value) return 0
  return Object.entries(planMetrics.value)
    .filter(([key]) => key.startsWith('plan:'))
    .reduce((sum, [, plan]: [string, any]) => sum + (plan.totalRows ?? 0), 0)
})

const planMetricCards = computed(() => [
  { label: 'Total Plans', value: totalPlans.value, icon: 'i-lucide-workflow', iconClass: 'text-primary' },
  { label: 'Active', value: activePlans.value, icon: 'i-lucide-zap', iconClass: 'text-success' },
  { label: 'Executions', value: totalExecutions.value, icon: 'i-lucide-repeat', iconClass: 'text-info' },
  { label: 'Rows Processed', value: totalRowsProcessed.value, icon: 'i-lucide-rows-4', iconClass: 'text-secondary' }
])

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
      <h1 class="text-2xl font-bold">
        <UIcon name="i-lucide-workflow" class="ml-0 mr-2" />Plans
      </h1>
      <p class="text-sm text-muted">Monitor and manage ETL pipeline executions</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard v-for="metric in planMetricCards" :key="metric.label" class="bg-metal-gradient">
        <div class="flex items-center gap-3">
          <UIcon :name="metric.icon" class="size-12" :class="metric.iconClass" />
          <div>
            <p class="text-2xl font-bold">{{ metric.value }}</p>
            <p class="text-xs text-muted">{{ metric.label }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <UCard class="lg:col-span-2 bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">All Plans</h2>
          </div>
        </template>
        <UTable :columns="planColumns" :data="allPlans">
          <template #status-cell="{ row }">
            <UBadge :color="statusColor(row.original.status)" variant="subtle" size="md">
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
            <UButton variant="link" color="primary"
              @click="selectedPlan = selectedPlan === row.original.name ? null : row.original.name">
              {{ row.original.name }}
            </UButton>
          </template>
        </UTable>
      </UCard>

      <UCard class="bg-metal-gradient" v-if="selectedPlanData">
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

        <UTimeline :items="timelineItems" :default-value="activeStepIndex">
          <template #step-description="{ item }">
            <div class="flex gap-2 text-xs flex-wrap">
              <UTooltip v-if="item.rows?.input !== undefined" :text="`${item.rows.input} rows in`">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 cursor-default">
                  <UIcon name="i-lucide-arrow-right" class="size-3" />
                  {{ item.rows.input }}
                </span>
              </UTooltip>
              <UTooltip v-if="item.rows?.passed !== undefined" :text="`${item.rows.passed} rows passed`">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success cursor-default">
                  <UIcon name="i-lucide-check" class="size-3" />
                  {{ item.rows.passed }}
                </span>
              </UTooltip>
              <UTooltip v-if="item.rows?.failed !== undefined" :text="`${item.rows.failed} rows failed`">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/15 text-error cursor-default">
                  <UIcon name="i-lucide-x" class="size-3" />
                  {{ item.rows.failed }}
                </span>
              </UTooltip>
              <UTooltip v-if="item.rows?.skipped !== undefined" :text="`${item.rows.skipped} rows skipped`">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning cursor-default">
                  <UIcon name="i-lucide-forward" class="size-3" />
                  {{ item.rows.skipped }}
                </span>
              </UTooltip>
              <UTooltip v-if="item.rows?.sunk !== undefined" :text="`${item.rows.sunk} rows sunk`">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/15 text-info cursor-default">
                  <UIcon name="i-lucide-database" class="size-3" />
                  {{ item.rows.sunk }}
                </span>
              </UTooltip>
            </div>
          </template>
        </UTimeline>
      </UCard>
    </div>
  </div>
</template>
