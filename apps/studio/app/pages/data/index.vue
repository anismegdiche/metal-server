<script setup lang="ts">
import { getProviderIcon } from '~/utils/constants'

interface SourceConfig {
  provider: string
  database?: string
  host?: string
  port?: number
  user?: string
  password?: string
  options?: Record<string, any>
}

interface SchemaConfig {
  source?: string
  entities?: Record<string, { source: string; entity: string }>
}

const sources = ref<Record<string, SourceConfig>>({})
const schemas = ref<Record<string, SchemaConfig>>({})
const sourcesLoading = ref(true)
const schemasLoading = ref(true)

const { data: sourcesMetrics } = useMetricsPolling('/server-api/api/metrics/sources/sources:%7E')
const { data: schemaMetrics } = useMetricsPolling('/server-api/api/metrics/schemas/schemas:%7E')

const sourceModalRef = ref<InstanceType<any>>(null)
const schemaModalRef = ref<InstanceType<any>>(null)

const toast = useToast()

const deleteTarget = ref<{ type: 'source' | 'schema', name: string } | null>(null)
const deleteModalOpen = ref(false)
const deleteLoading = ref(false)

const deleteTitle = computed(() => deleteTarget.value?.type === 'source' ? 'Delete Source' : 'Delete Schema')
const deleteMessage = computed(() =>
  deleteTarget.value
    ? `Are you sure you want to delete ${deleteTarget.value.type} '${deleteTarget.value.name}'? This action cannot be undone.`
    : ''
)

const sourceDetails = computed(() => sourcesMetrics.value?.['sources:details'] ?? {})

const sourceTableData = computed(() =>
  Object.entries(sources.value).map(([name, config]) => ({
    name,
    provider: config.provider,
    host: config.host ?? '-',
    port: config.port ?? '',
    database: config.database ?? '-',
    status: sourceDetails.value[name]?.status ?? 'unknown',
  }))
)

const schemaTableData = computed(() => {
  const details = schemaMetrics.value?.['schemas:details'] ?? {}
  return Object.entries(schemas.value).map(([name, config]) => {
    const schemaSources = Object.keys(details[name]?.sources ?? {})
    const anyDisconnected = schemaSources.some((sn: string) => sourceDetails.value[sn]?.status === 'disconnected')
    const allConnected =
      schemaSources.length > 0 && schemaSources.every((sn: string) => sourceDetails.value[sn]?.status === 'connected')
    return {
      name,
      source: config.source ?? '-',
      entityCount: config.entities ? Object.keys(config.entities).length : 0,
      status: anyDisconnected ? 'degraded' : allConnected ? 'healthy' : 'healthy',
    }
  })
})

const sourceColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'provider', header: 'Provider' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' },
]

const schemaColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'source', header: 'Source' },
  { accessorKey: 'entityCount', header: 'Entities' },
  { accessorKey: 'actions', header: '' },
]

const sourceOptions = computed(() =>
  Object.keys(sources.value).map((name) => ({ label: name, value: name }))
)

async function loadSources() {
  sourcesLoading.value = true
  try {
    sources.value = await $fetch('/server-api/api/config/sources')
  } catch {
    sources.value = {}
  } finally {
    sourcesLoading.value = false
  }
}

async function loadSchemas() {
  schemasLoading.value = true
  try {
    schemas.value = await $fetch('/server-api/api/config/schemas')
  } catch {
    schemas.value = {}
  } finally {
    schemasLoading.value = false
  }
}

async function loadData() {
  await Promise.all([loadSources(), loadSchemas()])
}

function openAddSource() {
  sourceModalRef.value?.openAdd()
}

function openEditSource(name: string) {
  sourceModalRef.value?.openEdit(name)
}

function deleteSource(name: string) {
  deleteTarget.value = { type: 'source', name }
  deleteModalOpen.value = true
}

function deleteSchema(name: string) {
  deleteTarget.value = { type: 'schema', name }
  deleteModalOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return
  deleteLoading.value = true
  try {
    if (target.type === 'source') {
      await $fetch(`/server-api/api/config/sources/${encodeURIComponent(target.name)}`, { method: 'DELETE' })
      await loadSources()
      toast.add({ title: 'Source deleted', description: `'${target.name}' was removed`, color: 'success' })
    } else {
      await $fetch(`/server-api/api/config/schemas/${encodeURIComponent(target.name)}`, { method: 'DELETE' })
      await loadSchemas()
      toast.add({ title: 'Schema deleted', description: `'${target.name}' was removed`, color: 'success' })
    }
    deleteModalOpen.value = false
    deleteTarget.value = null
  } catch (e: any) {
    toast.add({
      title: 'Delete failed',
      description: e?.data?.message ?? `Failed to delete ${target.type} '${target.name}'`,
      color: 'error',
    })
  } finally {
    deleteLoading.value = false
  }
}

function openAddSchema() {
  schemaModalRef.value?.openAdd()
}

function openEditSchema(name: string) {
  schemaModalRef.value?.openEdit(name)
}

onMounted(loadData)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <PageHeader icon="i-lucide-database" title="Data" description="Manage sources, schemas, and browse data" />
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-atom" label="MCP Tools" size="sm" variant="outline" to="/data/mcp-tools" />
        <UButton icon="i-lucide-refresh-cw" label="Refresh" size="sm" variant="outline" @click="loadData" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-plug" class="size-5 text-primary" />
              <h2 class="font-semibold text-sm">Sources</h2>
            </div>
            <UButton icon="i-lucide-plus" label="Add Source" size="xs" variant="outline" @click="openAddSource" />
          </div>
        </template>
        <UTable :columns="sourceColumns" :data="sourceTableData" :ui="{ th: 'px-2', td: 'px-2 py-2' }">
          <template #provider-cell="{ row }">
            <div class="flex items-center gap-2">
              <UIcon :name="getProviderIcon(row.original.provider)" class="size-4 text-muted" />
              <span>{{ row.original.provider }}</span>
            </div>
          </template>
          <template #status-cell="{ row }">
            <StatusBadge :status="row.original.status === 'connected' ? 'connected' : 'disconnected'" size="md" />
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEditSource(row.original.name)" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" @click="deleteSource(row.original.name)" />
            </div>
          </template>
        </UTable>
        <div v-if="sourcesLoading" class="text-center text-sm text-muted py-4">Loading sources...</div>
        <div v-else-if="sourceTableData.length === 0" class="text-center text-sm text-muted py-4">No sources configured</div>
      </UCard>

      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-book-open" class="size-5 text-warning" />
              <h2 class="font-semibold text-sm">Schemas</h2>
            </div>
            <UButton icon="i-lucide-plus" label="Add Schema" size="xs" variant="outline" @click="openAddSchema" />
          </div>
        </template>
        <UTable :columns="schemaColumns" :data="schemaTableData" :ui="{ th: 'px-2', td: 'px-2 py-2' }">
          <template #entityCount-cell="{ row }">
            <UBadge variant="subtle" color="neutral" size="sm">{{ row.original.entityCount }}</UBadge>
          </template>
          <template #status-cell="{ row }">
            <StatusBadge :status="row.original.status" size="md" />
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEditSchema(row.original.name)" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" @click="deleteSchema(row.original.name)" />
            </div>
          </template>
        </UTable>
        <div v-if="schemasLoading" class="text-center text-sm text-muted py-4">Loading schemas...</div>
        <div v-else-if="schemaTableData.length === 0" class="text-center text-sm text-muted py-4">No schemas configured</div>
      </UCard>
    </div>

    <DataBrowser :sources="sources" :schemas="schemas" />

    <SourceModal ref="sourceModalRef" :sources="sources" @saved="loadSources" />

    <SchemaModal ref="schemaModalRef" :schemas="schemas" :source-options="sourceOptions" @saved="loadSchemas" />

    <UModal v-model:open="deleteModalOpen" :title="deleteTitle">
      <template #body>
        <p class="text-sm">{{ deleteMessage }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="outline" size="sm" @click="() => { deleteModalOpen = false }" />
          <UButton label="Delete" color="primary" size="sm" :loading="deleteLoading" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
