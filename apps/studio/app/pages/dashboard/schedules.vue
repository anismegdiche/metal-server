<script setup lang="ts">
const { formatDateTime } = useFormatting()

const { data: metrics, refresh } = useMetricsPolling('/server-api/metrics/schedules/schedules:%7E')

const schedules = computed(() => {
  if (!metrics.value) return []
  const details = metrics.value['schedules:details'] ?? {}
  return Object.entries(details).map(([jobName, d]: [string, any]) => ({
    jobName,
    plan: d.plan ?? '',
    cron: d.cron ?? '',
    status: d.status ?? 'active',
    lastFire: d.lastFire,
    nextFire: d.nextFire,
  }))
})

const totalActive = computed(() => metrics.value?.['schedules:active'] ?? 0)
const totalSchedules = computed(() => metrics.value?.['schedules:total'] ?? 0)
const totalCompleted = computed(() => schedules.value.filter(s => s.status === 'completed').length)

const columns = [
  { accessorKey: 'jobName', header: 'Job Name' },
  { accessorKey: 'plan', header: 'Plan' },
  { accessorKey: 'cron', header: 'Cron' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'lastFire', header: 'Last Fire' },
  { accessorKey: 'nextFire', header: 'Next Fire' },
]

function formatNextFire(cron: string, iso: string | null): string {
  if (cron === '@start') return 'Never'
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader icon="i-lucide-calendar-clock" title="Schedules" description="Cron-based job scheduling for plan execution" />

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard icon="i-lucide-calendar-clock" :value="totalSchedules" label="Total" icon-class="text-primary" />
      <MetricCard icon="i-lucide-zap" :value="totalActive" label="Active" icon-class="text-info" />
      <MetricCard icon="i-lucide-check-circle" :value="totalCompleted" label="Completed" icon-class="text-success" />
    </div>

    <UCard class="bg-metal-gradient">
      <UTable :columns="columns" :data="schedules" :ui="{
          th: 'px-2',
          td: 'px-2 py-2'
        }">
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status === 'active' ? 'active' : row.original.status === 'completed' ? 'completed' : 'neutral'" size="sm" />
        </template>
        <template #lastFire-cell="{ row }">
          <span class="text-sm">{{ formatDateTime(row.original.lastFire) }}</span>
        </template>
        <template #nextFire-cell="{ row }">
          <span class="text-sm" :class="row.original.cron === '@start' ? 'text-muted italic' : ''">
            {{ formatNextFire(row.original.cron, row.original.nextFire) }}
          </span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
