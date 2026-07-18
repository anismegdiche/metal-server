<script setup lang="ts">
import { getProviderIcon } from '~/utils/constants'

const { data: sourcesMetrics, refresh: refreshSources } = useMetricsPolling('/server-api/metrics/sources/sources:%7E')

const totalSources = computed(() => sourcesMetrics.value?.['sources:total'] ?? 0)
const activeSources = computed(() => sourcesMetrics.value?.['sources:active'] ?? 0)
const disconnectedSources = computed(() => totalSources.value - activeSources.value)

const sourceMetricCards = computed(() => [
  { label: 'Total Sources', value: totalSources.value, icon: 'i-lucide-plug', iconClass: 'text-primary' },
  { label: 'Active', value: activeSources.value, icon: 'i-lucide-zap', iconClass: 'text-success' },
  { label: 'Disconnected', value: disconnectedSources.value, icon: 'i-lucide-alert-triangle', iconClass: 'text-warning' }
])

const allSources = computed(() => {
  if (!sourcesMetrics.value) return []
  const details = sourcesMetrics.value['sources:details'] ?? {}
  return Object.entries(details).map(([name, info]: [string, any]) => ({
    name,
    provider: info.provider ?? 'unknown',
    host: info.host ?? 'local',
    port: info.port ?? null,
    database: info.database ?? null,
    status: info.status ?? 'unknown'
  }))
})

const sourceColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'provider', header: 'Type' },
  { accessorKey: 'host', header: 'Host' },
  { accessorKey: 'status', header: 'Status' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader icon="i-lucide-plug" title="Sources" description="Data source connections and their status" />

    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <MetricCard v-for="metric in sourceMetricCards" :key="metric.label" v-bind="metric" />
    </div>

    <UCard class="bg-metal-gradient">
      <template #header>
        <h2 class="font-semibold">All Sources</h2>
      </template>
      <UTable :columns="sourceColumns" :data="allSources" :ui="{
          th: 'px-2',
          td: 'px-2 py-2'
        }">
        <template #provider-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon :name="getProviderIcon(row.original.provider)" class="size-4 text-muted" />
            <span>{{ row.original.provider }}</span>
          </div>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status === 'connected' ? 'connected' : 'error'" size="md" />
        </template>
      </UTable>
    </UCard>
  </div>
</template>
