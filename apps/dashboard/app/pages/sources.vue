<script setup lang="ts">
const { data: sourcesMetrics, refresh: refreshSources } = useFetch<Record<string, any>>('/server-api/metrics/sources/sources:~')

onMounted(() => {
  const interval = setInterval(refreshSources, 5000)
  onUnmounted(() => clearInterval(interval))
})

const totalSources = computed(() => sourcesMetrics.value?.['sources:total'] ?? 0)
const activeSources = computed(() => sourcesMetrics.value?.['sources:active'] ?? 0)
const disconnectedSources = computed(() => totalSources.value - activeSources.value)

const sourceMetricCards = computed(() => [
  { label: 'Total Sources', value: totalSources.value, icon: 'i-lucide-layers', iconClass: 'text-primary' },
  { label: 'Active', value: activeSources.value, icon: 'i-lucide-plug', iconClass: 'text-success' },
  { label: 'Disconnected', value: disconnectedSources.value, icon: 'i-lucide-plug-off', iconClass: 'text-error' }
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

function providerIcon(provider: string) {
  const map: Record<string, string> = {
    postgres: 'i-lucide-database',
    mongodb: 'i-lucide-database',
    mssql: 'i-lucide-database',
    mysql: 'i-lucide-database',
    cosmosdb: 'i-lucide-database',
    webservice: 'i-lucide-globe',
    storage: 'i-lucide-hard-drive',
    metal: 'i-lucide-server',
    memory: 'i-lucide-cpu',
    plans: 'i-lucide-workflow'
  }
  return map[provider] ?? 'i-lucide-database'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-plug ml-0 mr-2" />Sources</h1>
      <p class="text-sm text-muted">Data source connections and their status</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <UCard v-for="metric in sourceMetricCards" :key="metric.label">
        <div class="flex items-center gap-3">
          <UIcon :name="metric.icon" class="size-5" :class="metric.iconClass" />
          <div>
            <p class="text-2xl font-bold">{{ metric.value }}</p>
            <p class="text-xs text-muted">{{ metric.label }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">All Sources</h2>
      </template>
      <UTable :columns="sourceColumns" :data="allSources">
        <template #provider-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon :name="providerIcon(row.original.provider)" class="size-4 text-muted" />
            <span>{{ row.original.provider }}</span>
          </div>
        </template>
        <template #status-cell="{ row }">
          <div class="flex items-center gap-2">
            <div
              class="size-2 rounded-full"
              :class="row.original.status === 'connected' ? 'bg-success' : 'bg-error'"
            />
            <span class="text-sm">{{ row.original.status }}</span>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
