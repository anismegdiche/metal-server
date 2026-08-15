<script setup lang="ts">
import { SCHEMA_TYPE_BADGE, STATUS_DOT_MAP, STATUS_LABEL_MAP, getProviderIcon } from '~/utils/constants'

const { formatNumber, errorPercent } = useFormatting()

const { data: schemaMetrics, refresh: refreshSchemas } = useMetricsPolling('/server-api/api/metrics/schemas/schemas:%7E')
const { data: sourcesMetrics, refresh: refreshSources } = useMetricsPolling('/server-api/api/metrics/sources/sources:%7E')
useMultiMetricsPolling([{ refresh: refreshSchemas }, { refresh: refreshSources }])

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

function sourceTotal(s: any): number {
  return (s.reads || 0) + (s.writes || 0) + (s.deletes || 0)
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader icon="i-lucide-book-open" title="Schemas" description="Schema performance and entity activity" />

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard icon="i-lucide-book-open" :value="schemasList.length" label="Total Schemas"
        icon-class="text-primary" />
      <MetricCard icon="i-lucide-activity" :value="formatNumber(totalRequests)" label="Total Operations"
        icon-class="text-success">
        <template #sub>{{ formatNumber(totalReads) }} reads / {{ formatNumber(totalWrites) }} writes / {{
          formatNumber(totalDeletes) }} deletes</template>
      </MetricCard>
      <MetricCard icon="i-lucide-clock" :value="`${avgDuration}ms`" label="Avg Duration" icon-class="text-info" />
      <MetricCard icon="i-lucide-alert-triangle" :value="`${errorRate}%`" label="Error Rate" icon-class="text-warning">
        <template #sub>{{ formatNumber(totalErrors) }} errors</template>
      </MetricCard>
    </div>

    <UCard class="bg-metal-gradient">
      <template #header>
        <h2 class="font-semibold">All Schemas</h2>
      </template>
      <UTable :columns="tableColumns" :data="schemasList"
        :selected="selectedSchemaName ? [schemasList.findIndex(s => s.name === selectedSchemaName)] : []"
        @select="(row: any) => { selectedSchemaName = schemasList[row.index]?.name ?? null }" :ui="{
          th: 'px-2',
          td: 'px-2 py-2'
        }">
        <template #name-cell="{ row }">
          <UButton variant="link" color="primary" :class="{ 'font-bold': selectedSchemaName === row.original.name }"
            @click="() => { selectedSchemaName = row.original.name }">
            {{ row.original.name }}
          </UButton>
        </template>
        <template #type-cell="{ row }">
          <UBadge :color="(SCHEMA_TYPE_BADGE[row.original.type]?.color as any) ?? 'neutral'" variant="subtle" size="sm">
            {{ SCHEMA_TYPE_BADGE[row.original.type]?.label }}
          </UBadge>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" size="md" />
        </template>
        <template #reads-cell="{ row }">
          <span class="font-mono text-info text-sm">{{ formatNumber(row.original.reads) }}</span>
        </template>
        <template #writes-cell="{ row }">
          <span class="font-mono text-success text-sm">{{ formatNumber(row.original.writes) }}</span>
        </template>
        <template #deletes-cell="{ row }">
          <span class="font-mono text-warning text-sm">{{ formatNumber(row.original.deletes) }}</span>
        </template>
        <template #errors-cell="{ row }">
          <span class="font-mono text-sm" :class="row.original.errors > 0 ? 'text-error' : ''">
            {{ formatNumber(row.original.errors) }}
          </span>
        </template>
        <template #avgDuration-cell="{ row }">
          <span class="text-sm font-mono">{{ row.original.avgDuration }}ms</span>
        </template>
      </UTable>
    </UCard>

    <UCard class="bg-metal-gradient" v-if="selectedSchema">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-layers" class="size-4 text-primary" />
            <h2 class="font-semibold">{{ selectedSchema.name }}</h2>
            <UBadge :color="(SCHEMA_TYPE_BADGE[selectedSchema.type]?.color as any) ?? 'neutral'" variant="subtle"
              size="xs">
              {{ SCHEMA_TYPE_BADGE[selectedSchema.type]?.label }}
            </UBadge>
            <StatusBadge :status="selectedSchema.status" size="sm" />
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
            <UIcon :name="getProviderIcon(source.provider)" class="size-4 text-muted" />
            <span class="text-sm font-semibold">{{ source.name }}</span>
            <div class="flex items-center gap-1.5">
              <span class="size-2 rounded-full"
                :class="STATUS_DOT_MAP[source.status === 'connected' ? 'healthy' : source.status === 'disconnected' ? 'down' : 'degraded']" />
              <span class="text-xs text-muted">{{ source.status === 'connected' ? 'Connected' : source.status ===
                'disconnected' ? 'Disconnected' : source.status }}</span>
            </div>
            <span class="text-xs text-muted ml-auto font-mono">
              {{ formatNumber(sourceTotal(source)) }} ops · {{ errorPercent(source.errors, sourceTotal(source)) }}
              errors ·
              {{ source.avgDuration }}ms avg
            </span>
          </div>

          <div v-if="source.entities.length > 0" class="pl-6">
            <UTable :columns="entityTableColumns" :data="source.entities" :ui="{
              th: 'px-2',
              td: 'px-2 py-2'
            }">
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
