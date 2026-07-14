<script setup lang="ts">
const { data: metrics, refresh } = useFetch<Record<string, any>>('/server-api/metrics/schedules/schedules:~')

onMounted(() => {
  const interval = setInterval(refresh, 5000)
  onUnmounted(() => clearInterval(interval))
})

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

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function formatNextFire(cron: string, iso: string | null): string {
  if (cron === '@start') return 'Never'
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-calendar-clock" class="ml-0 mr-2" />Schedules</h1>
      <p class="text-sm text-muted">Cron-based job scheduling for plan execution</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-play" class="size-5 text-success" />
          <div>
            <p class="text-2xl font-bold">{{ totalActive }}</p>
            <p class="text-xs text-muted">Active</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-calendar" class="size-5 text-primary" />
          <div>
            <p class="text-2xl font-bold">{{ totalSchedules }}</p>
            <p class="text-xs text-muted">Total</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-check-circle" class="size-5 text-muted" />
          <div>
            <p class="text-2xl font-bold">{{ totalCompleted }}</p>
            <p class="text-xs text-muted">Completed</p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <UTable :columns="columns" :data="schedules">
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'active' ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.status }}
          </UBadge>
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
