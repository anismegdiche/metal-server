<script setup lang="ts">
const schedules = ref([
  { jobName: 'nightly-sync', cron: '0 18 * * *', status: 'running', lastFire: '2026-07-07T18:00:00Z', nextFire: '2026-07-08T18:00:00Z', plan: 'nightly-sync' },
  { jobName: 'user-import', cron: '0 0 * * *', status: 'running', lastFire: '2026-07-07T00:00:00Z', nextFire: '2026-07-08T00:00:00Z', plan: 'user-import' },
  { jobName: 'hourly-metrics', cron: '0 * * * *', status: 'running', lastFire: '2026-07-07T19:00:00Z', nextFire: '2026-07-07T20:00:00Z', plan: 'collect-metrics' },
  { jobName: 'weekly-report', cron: '0 9 * * 1', status: 'stopped', lastFire: '2026-07-06T09:00:00Z', nextFire: '2026-07-13T09:00:00Z', plan: 'report-gen' },
  { jobName: 'data-cleanup', cron: '*/30 * * * *', status: 'running', lastFire: '2026-07-07T19:00:00Z', nextFire: '2026-07-07T19:30:00Z', plan: 'cleanup-old-records' },
  { jobName: 'db-backup', cron: '0 2 * * *', status: 'running', lastFire: '2026-07-07T02:00:00Z', nextFire: '2026-07-08T02:00:00Z', plan: 'backup-databases' },
  { jobName: 'cache-clean', cron: '0 4 * * 0', status: 'running', lastFire: '2026-07-06T04:00:00Z', nextFire: '2026-07-13T04:00:00Z', plan: 'purge-cache' }
])

const columns = [
  { accessorKey: 'jobName', header: 'Job Name' },
  { accessorKey: 'plan', header: 'Plan' },
  { accessorKey: 'cron', header: 'Cron Expression' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'lastFire', header: 'Last Fire' },
  { accessorKey: 'nextFire', header: 'Next Fire' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-calendar-clock ml-0 mr-2" />Schedules</h1>
      <p class="text-sm text-muted">Cron-based job scheduling for plan execution</p>
    </div>

    <UCard>
      <UCard>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex flex-col items-center p-4 rounded-lg bg-elevated/50">
            <span class="text-2xl font-bold">{{ schedules.filter(s => s.status === 'running').length }}</span>
            <span class="text-sm text-muted">Active</span>
          </div>
          <div class="flex flex-col items-center p-4 rounded-lg bg-elevated/50">
            <span class="text-2xl font-bold">{{ schedules.length }}</span>
            <span class="text-sm text-muted">Total</span>
          </div>
          <div class="flex flex-col items-center p-4 rounded-lg bg-elevated/50">
            <span class="text-2xl font-bold">{{ schedules.filter(s => s.status === 'stopped').length }}</span>
            <span class="text-sm text-muted">Stopped</span>
          </div>
        </div>
      </UCard>

      <UTable :columns="columns" :data="schedules">
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'running' ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.status }}
          </UBadge>
        </template>
        <template #lastFire-cell="{ row }">
          <span class="text-sm">{{ new Date(row.original.lastFire).toLocaleString() }}</span>
        </template>
        <template #nextFire-cell="{ row }">
          <span class="text-sm">{{ new Date(row.original.nextFire).toLocaleString() }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            :color="row.original.status === 'running' ? 'error' : 'success'"
            variant="ghost"
            size="sm"
            :icon="row.original.status === 'running' ? 'i-lucide-square' : 'i-lucide-play'"
          />
        </template>
      </UTable>
    </UCard>
  </div>
</template>
