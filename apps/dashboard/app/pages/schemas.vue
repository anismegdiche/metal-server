<script setup lang="ts">
const { data: schemaMetrics, refresh: refreshSchemas } = useFetch<Record<string, any>>('/server-api/metrics/schemas/schemas:~')
const { data: sourcesMetrics, refresh: refreshSources } = useFetch<Record<string, any>>('/server-api/metrics/sources/sources:~')

onMounted(() => {
  const interval = setInterval(() => {
    refreshSchemas()
    refreshSources()
  }, 5000)
  onUnmounted(() => clearInterval(interval))
})

const schemasList = computed(() => {
  if (!schemaMetrics.value) return []
  const names: string[] = schemaMetrics.value['schemas'] ?? []
  const details = schemaMetrics.value['schemas:details'] ?? {}
  const sourceDetails = sourcesMetrics.value?.['sources:details'] ?? {}

  return names.map((name: string) => {
    const d = details[name] ?? { type: 'source', reads: 0, writes: 0, deletes: 0, errors: 0, avgDuration: 0, sources: {} }

    const sourceNames = Object.keys(d.sources ?? {})
    const anyDisconnected = sourceNames.some((sn: string) => sourceDetails[sn]?.status === 'disconnected')
    const allConnected = sourceNames.length > 0 && sourceNames.every((sn: string) => sourceDetails[sn]?.status === 'connected')
    const status = anyDisconnected ? 'degraded' : allConnected ? 'healthy' : 'healthy'

    const sources = Object.entries(d.sources ?? {}).map(([srcName, srcData]: [string, any]) => ({
      name: srcName,
      provider: sourceDetails[srcName]?.provider ?? 'unknown',
      status: (sourceDetails[srcName]?.status ?? 'unknown') as string,
      reads: srcData.reads ?? 0,
      writes: srcData.writes ?? 0,
      deletes: srcData.deletes ?? 0,
      errors: srcData.errors ?? 0,
      avgDuration: srcData.avgDuration ?? 0,
      entities: Object.entries(srcData.entities ?? {}).map(([entName, entData]: [string, any]) => ({
        name: entName,
        reads: entData.reads ?? 0,
        writes: entData.writes ?? 0,
        deletes: entData.deletes ?? 0,
        errors: entData.errors ?? 0,
        avgDuration: entData.avgDuration ?? 0
      }))
    }))

    const entityCount = sources.reduce((sum, s) => sum + s.entities.length, 0)

    return {
      name,
      type: d.type as 'source' | 'entities' | 'mixed',
      status,
      reads: d.reads ?? 0,
      writes: d.writes ?? 0,
      deletes: d.deletes ?? 0,
      errors: d.errors ?? 0,
      avgDuration: d.avgDuration ?? 0,
      entityCount,
      sources
    }
  })
})

const selectedSchemaName = ref<string | null>(null)

watch(schemasList, (list) => {
  if (list.length > 0 && !selectedSchemaName.value) {
    selectedSchemaName.value = list[0]!.name
  }
}, { immediate: true })

const selectedSchema = computed(() => {
  if (!selectedSchemaName.value) return null
  return schemasList.value.find(s => s.name === selectedSchemaName.value) ?? null
})

const totalReads = computed(() => schemasList.value.reduce((a, s) => a + s.reads, 0))
const totalWrites = computed(() => schemasList.value.reduce((a, s) => a + s.writes, 0))
const totalDeletes = computed(() => schemasList.value.reduce((a, s) => a + s.deletes, 0))
const totalErrors = computed(() => schemasList.value.reduce((a, s) => a + s.errors, 0))
const totalRequests = computed(() => totalReads.value + totalWrites.value + totalDeletes.value)
const avgDuration = computed(() => {
  const total = schemasList.value.reduce((a, s) => a + s.avgDuration * (s.reads + s.writes + s.deletes), 0)
  return totalRequests.value > 0 ? Math.round(total / totalRequests.value) : 0
})
const errorRate = computed(() => totalRequests.value > 0 ? ((totalErrors.value / totalRequests.value) * 100).toFixed(2) : '0')

const providerIcon: Record<string, string> = { mssql: 'i-lucide-server', postgresql: 'i-lucide-database', mongodb: 'i-lucide-leaf' }
const typeIcon: Record<string, string> = { table: 'i-lucide-table', view: 'i-lucide-eye', collection: 'i-lucide-box' }

const schemaTypeBadge: Record<string, { label: string, color: string }> = {
  'source': { label: 'Source', color: 'info' },
  'entities': { label: 'Entities', color: 'warning' },
  'mixed': { label: 'Mixed', color: 'primary' }
}

const statusDot: Record<string, string> = {
  healthy: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-error'
}

const statusLabel: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down'
}

const tableColumns = [
  { accessorKey: 'name', header: 'Schema' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'reads', header: 'Reads' },
  { accessorKey: 'writes', header: 'Writes' },
  { accessorKey: 'deletes', header: 'Deletes' },
  { accessorKey: 'errors', header: 'Errors' },
  { accessorKey: 'avgDuration', header: 'Avg' }
]

const entityTableColumns = [
  { accessorKey: 'name', header: 'Entity' },
  { accessorKey: 'reads', header: 'Reads' },
  { accessorKey: 'writes', header: 'Writes' },
  { accessorKey: 'deletes', header: 'Deletes' },
  { accessorKey: 'errors', header: 'Errors' },
  { accessorKey: 'avgDuration', header: 'Avg' }
]

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function errorPercent(errors: number, total: number): string {
  if (total === 0) return '0%'
  return ((errors / total) * 100).toFixed(1) + '%'
}

function entityTotal(e: any): number {
  return (e.reads || 0) + (e.writes || 0) + (e.deletes || 0)
}

function sourceTotal(s: any): number {
  return (s.reads || 0) + (s.writes || 0) + (s.deletes || 0)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-book-open" class="ml-0 mr-2" />Schemas</h1>
      <p class="text-sm text-muted">Schema performance and entity activity</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-layers" class="size-5 text-primary" />
          <div>
            <p class="text-2xl font-bold">{{ schemasList.length }}</p>
            <p class="text-xs text-muted">Total Schemas</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-activity" class="size-5 text-info" />
          <div>
            <p class="text-2xl font-bold">{{ formatNumber(totalRequests) }}</p>
            <p class="text-xs text-muted">Total Operations</p>
            <p class="text-[10px] text-muted font-mono">{{ formatNumber(totalReads) }} reads / {{ formatNumber(totalWrites) }} writes / {{ formatNumber(totalDeletes) }} deletes</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-clock" class="size-5 text-warning" />
          <div>
            <p class="text-2xl font-bold">{{ avgDuration }}ms</p>
            <p class="text-xs text-muted">Avg Duration</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-alert-triangle" class="size-5 text-error" />
          <div>
            <p class="text-2xl font-bold">{{ errorRate }}%</p>
            <p class="text-xs text-muted">Error Rate</p>
            <p class="text-[10px] text-muted font-mono">{{ formatNumber(totalErrors) }} errors</p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">All Schemas</h2>
      </template>
      <UTable
        :columns="tableColumns"
        :data="schemasList"
        :selected="selectedSchemaName ? [schemasList.findIndex(s => s.name === selectedSchemaName)] : []"
        @select="(row: any) => { selectedSchemaName = schemasList[row.index]?.name ?? null }"
      >
        <template #name-cell="{ row }">
          <UButton
            variant="link"
            color="primary"
            :class="{ 'font-bold': selectedSchemaName === row.original.name }"
            @click="() => { selectedSchemaName = row.original.name }"
          >
            {{ row.original.name }}
          </UButton>
        </template>
        <template #type-cell="{ row }">
          <UBadge
            :color="(schemaTypeBadge[row.original.type]?.color as any) ?? 'neutral'"
            variant="subtle"
            size="xs"
          >
            {{ schemaTypeBadge[row.original.type]?.label }}
          </UBadge>
        </template>
        <template #status-cell="{ row }">
          <div class="flex items-center gap-1.5">
            <span class="size-2 rounded-full" :class="statusDot[row.original.status]" />
            <span class="text-xs">{{ statusLabel[row.original.status] }}</span>
          </div>
        </template>
        <template #reads-cell="{ row }">
          <span class="text-sm font-mono text-info">{{ formatNumber(row.original.reads) }}</span>
        </template>
        <template #writes-cell="{ row }">
          <span class="text-sm font-mono text-success">{{ formatNumber(row.original.writes) }}</span>
        </template>
        <template #deletes-cell="{ row }">
          <span class="text-sm font-mono text-warning">{{ formatNumber(row.original.deletes) }}</span>
        </template>
        <template #errors-cell="{ row }">
          <span class="text-sm font-mono" :class="row.original.errors > 0 ? 'text-error' : ''">
            {{ formatNumber(row.original.errors) }}
          </span>
        </template>
        <template #avgDuration-cell="{ row }">
          <span class="text-sm font-mono">{{ row.original.avgDuration }}ms</span>
        </template>
      </UTable>
    </UCard>

    <UCard v-if="selectedSchema">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-layers" class="size-4 text-primary" />
            <h2 class="font-semibold">{{ selectedSchema.name }}</h2>
            <UBadge
              :color="(schemaTypeBadge[selectedSchema.type]?.color as any) ?? 'neutral'"
              variant="subtle"
              size="xs"
            >
              {{ schemaTypeBadge[selectedSchema.type]?.label }}
            </UBadge>
            <div class="flex items-center gap-1.5 ml-2">
              <span class="size-2 rounded-full" :class="statusDot[selectedSchema.status]" />
              <span class="text-xs text-muted">{{ statusLabel[selectedSchema.status] }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="flex flex-col gap-5 overflow-auto">
        <div class="grid grid-cols-4 gap-3">
          <div class="flex flex-col gap-0.5 p-3 rounded-lg bg-elevated">
            <p class="text-xs text-muted">Reads</p>
            <p class="text-lg font-bold font-mono text-info">{{ formatNumber(selectedSchema.reads) }}</p>
          </div>
          <div class="flex flex-col gap-0.5 p-3 rounded-lg bg-elevated">
            <p class="text-xs text-muted">Writes</p>
            <p class="text-lg font-bold font-mono text-success">{{ formatNumber(selectedSchema.writes) }}</p>
          </div>
          <div class="flex flex-col gap-0.5 p-3 rounded-lg bg-elevated">
            <p class="text-xs text-muted">Deletes</p>
            <p class="text-lg font-bold font-mono text-warning">{{ formatNumber(selectedSchema.deletes) }}</p>
          </div>
          <div class="flex flex-col gap-0.5 p-3 rounded-lg bg-elevated">
            <p class="text-xs text-muted">Errors</p>
            <p class="text-lg font-bold font-mono" :class="selectedSchema.errors > 0 ? 'text-error' : ''">
              {{ formatNumber(selectedSchema.errors) }}
            </p>
          </div>
        </div>

        <div v-for="source in selectedSchema.sources" :key="source.name" class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <UIcon :name="providerIcon[source.provider] ?? 'i-lucide-plug'" class="size-4 text-muted" />
            <span class="text-sm font-semibold">{{ source.name }}</span>
            <div class="flex items-center gap-1.5">
              <span class="size-2 rounded-full" :class="statusDot[source.status === 'connected' ? 'healthy' : source.status === 'disconnected' ? 'down' : 'degraded']" />
              <span class="text-xs text-muted">{{ source.status === 'connected' ? 'Connected' : source.status === 'disconnected' ? 'Disconnected' : source.status }}</span>
            </div>
            <span class="text-xs text-muted ml-auto font-mono">
              {{ formatNumber(sourceTotal(source)) }} ops · {{ errorPercent(source.errors, sourceTotal(source)) }} errors · {{ source.avgDuration }}ms avg
            </span>
          </div>

          <div v-if="source.entities.length > 0" class="pl-6">
            <UTable :columns="entityTableColumns" :data="source.entities">
              <template #name-cell="{ row }">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-table" class="size-3.5 text-info" />
                  <span class="text-sm font-medium">{{ row.original.name }}</span>
                </div>
              </template>
              <template #reads-cell="{ row }">
                <span class="text-sm font-mono text-info">{{ formatNumber(row.original.reads) }}</span>
              </template>
              <template #writes-cell="{ row }">
                <span class="text-sm font-mono text-success">{{ formatNumber(row.original.writes) }}</span>
              </template>
              <template #deletes-cell="{ row }">
                <span class="text-sm font-mono text-warning">{{ formatNumber(row.original.deletes) }}</span>
              </template>
              <template #errors-cell="{ row }">
                <span class="text-sm font-mono" :class="row.original.errors > 0 ? 'text-error' : ''">
                  {{ formatNumber(row.original.errors) }}
                </span>
              </template>
              <template #avgDuration-cell="{ row }">
                <span class="text-sm font-mono">{{ row.original.avgDuration }}ms</span>
              </template>
            </UTable>
          </div>
          <div v-else class="pl-6 text-xs text-muted italic">No entity metrics yet</div>
        </div>
      </div>
    </UCard>
  </div>
</template>
